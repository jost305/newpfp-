import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { ethers } from "ethers";

type CandidateRow = {
  agent_id: string;
  display_name: string;
  origin: string;
  wallet_address: string | null;
  owner_wallet: string | null;
  imported_by_wallet: string | null;
};

type Recipient = {
  address: string;
  profiles: number;
  origins: string[];
  fighters: string[];
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const BURN_ADDRESSES = new Set([
  ZERO_ADDRESS.toLowerCase(),
  "0x000000000000000000000000000000000000dead",
]);

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

function argValue(name: string) {
  const exact = process.argv.find((arg) => arg === name);
  if (exact) return "true";
  const prefix = `${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : "";
}

function envValue(...names: string[]) {
  for (const name of names) {
    const value = String(process.env[name] || "").trim();
    if (value) return value;
  }
  return "";
}

function normalizePrivateKey(value: string) {
  const trimmed = value.trim().replace(/^['"]|['"]$/g, "");
  if (!trimmed) return "";
  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}

function normalizeAddress(value: unknown) {
  try {
    const text = String(value || "").trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(text)) return null;
    const address = ethers.getAddress(text);
    if (BURN_ADDRESSES.has(address.toLowerCase())) return null;
    return address;
  } catch {
    return null;
  }
}

function parseOrigins() {
  const raw = argValue("--origins") || envValue("BOTA_REWARD_ORIGINS");
  return raw
    .split(",")
    .map((origin) => origin.trim().toLowerCase())
    .filter(Boolean);
}

function parsePositiveInteger(name: string, fallback: number) {
  const raw = argValue(`--${name}`) || envValue(`BOTA_REWARD_${name.toUpperCase()}`);
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function parseNonNegativeInteger(name: string, fallback: number) {
  const raw = argValue(`--${name}`) || envValue(`BOTA_REWARD_${name.toUpperCase().replace(/-/g, "_")}`);
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function ensureOutputDir() {
  const outputDir = path.resolve(process.cwd(), ".codex-tmp", "bota-rewards");
  fs.mkdirSync(outputDir, { recursive: true });
  return outputDir;
}

function writeJson(filename: string, payload: unknown) {
  const outputDir = ensureOutputDir();
  const target = path.join(outputDir, filename);
  fs.writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`);
  return target;
}

function writeCsv(filename: string, recipients: Recipient[]) {
  const outputDir = ensureOutputDir();
  const target = path.join(outputDir, filename);
  const header = "address,profiles,origins,fighters";
  const lines = recipients.map((recipient) =>
    [
      recipient.address,
      recipient.profiles,
      recipient.origins.join("|"),
      recipient.fighters.join("|").replace(/"/g, '""'),
    ]
      .map((value) => `"${String(value)}"`)
      .join(","),
  );
  fs.writeFileSync(target, `${header}\n${lines.join("\n")}\n`);
  return target;
}

async function loadRecipients() {
  const databaseUrl = envValue("DATABASE_URL");
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 15_000,
  });

  const origins = parseOrigins();
  const includeExternal = argValue("--include-external") === "true" || envValue("BOTA_REWARD_INCLUDE_EXTERNAL") === "true";
  const originFilter = origins.length
    ? origins
    : includeExternal
      ? []
      : ["ens", "nft", "token", "manual", "bota"];

  try {
    const rows = await pool.query<CandidateRow>(
      `
        SELECT
          agent_id,
          display_name,
          origin,
          wallet_address,
          metadata->>'ownerWallet' AS owner_wallet,
          metadata->>'importedByWallet' AS imported_by_wallet
        FROM bota_fighter_profiles
        WHERE (
          wallet_address ~* '^0x[0-9a-f]{40}$'
          OR metadata->>'ownerWallet' ~* '^0x[0-9a-f]{40}$'
          OR metadata->>'importedByWallet' ~* '^0x[0-9a-f]{40}$'
        )
        ${originFilter.length ? "AND lower(origin) = ANY($1::text[])" : ""}
        ORDER BY updated_at DESC
      `,
      originFilter.length ? [originFilter] : [],
    );

    const byAddress = new Map<string, Recipient>();
    for (const row of rows.rows) {
      const address =
        normalizeAddress(row.owner_wallet) ||
        normalizeAddress(row.imported_by_wallet) ||
        normalizeAddress(row.wallet_address);
      if (!address) continue;

      const key = address.toLowerCase();
      const existing =
        byAddress.get(key) ||
        ({
          address,
          profiles: 0,
          origins: [],
          fighters: [],
        } satisfies Recipient);

      existing.profiles += 1;
      if (!existing.origins.includes(row.origin)) existing.origins.push(row.origin);
      const label = `${row.display_name || row.agent_id} (${row.origin})`;
      if (!existing.fighters.includes(label)) existing.fighters.push(label);
      byAddress.set(key, existing);
    }

    const recipients = Array.from(byAddress.values()).sort((left, right) =>
      left.address.localeCompare(right.address),
    );
    return { recipients, profileRows: rows.rows.length, originFilter };
  } finally {
    await pool.end();
  }
}

async function main() {
  const execute = argValue("--execute") === "true";
  const exportOnly = argValue("--export-only") === "true";
  const limit = parsePositiveInteger("limit", Number.MAX_SAFE_INTEGER);
  const skipFirst = parseNonNegativeInteger("skip-first", 0);
  const rewardHuman = argValue("--amount") || envValue("BOTA_REWARD_AMOUNT") || "10";
  const confirmations = parsePositiveInteger("confirmations", 1);
  const tokenAddress = normalizeAddress(
    argValue("--token") ||
      envValue("BOTA_TOKEN_ADDRESS", "ONCHAIN_BASE_BOTA_ADDRESS") ||
      "0xC643Bc38F2CDa9cb315aB5e7b0764da149B6Db07",
  );
  if (!tokenAddress) throw new Error("Valid BOTA token address is required.");

  const privateKey = normalizePrivateKey(
    argValue("--private-key") ||
      envValue("BOTA_REWARD_PRIVATE_KEY", "BOTA_DEPLOYER_PRIVATE_KEY", "PRIVATE_KEY", "ADMIN_PRIVATE_KEY"),
  );
  if (execute && !/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
    throw new Error("A valid private key is required when --execute=true.");
  }

  const { recipients: allRecipients, profileRows, originFilter } = await loadRecipients();
  const recipients = allRecipients.slice(skipFirst, skipFirst + limit);
  const rewardRunId = new Date().toISOString().replace(/[:.]/g, "-");
  const recipientJson = writeJson(`recipients-${rewardRunId}.json`, {
    rewardRunId,
    rewardAmount: rewardHuman,
    tokenAddress,
    originFilter,
    profileRows,
    skippedFirst: skipFirst,
    totalUniqueRecipients: allRecipients.length,
    uniqueRecipients: recipients.length,
    recipients,
  });
  const recipientCsv = writeCsv(`recipients-${rewardRunId}.csv`, recipients);
  const exportSummary = {
    mode: exportOnly ? "export-only" : execute ? "execute" : "dry-run",
    rewardRunId,
    rewardAmountPerRecipient: rewardHuman,
    tokenAddress,
    originFilter,
    profileRows,
    skippedFirst: skipFirst,
    totalUniqueRecipients: allRecipients.length,
    uniqueRecipients: recipients.length,
    files: { recipientJson, recipientCsv },
  };

  if (exportOnly) {
    console.log(JSON.stringify(exportSummary, null, 2));
    return;
  }

  const rpcUrl = argValue("--rpc") || envValue("ONCHAIN_BASE_MAINNET_RPC_URL", "BASE_RPC_URL") || "https://mainnet.base.org";
  const provider = new ethers.JsonRpcProvider(rpcUrl, 8453);
  const signer = privateKey ? new ethers.Wallet(privateKey, provider) : null;
  const senderAddress = signer?.address || null;
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer || provider);
  const [name, symbol, decimals] = await Promise.all([token.name(), token.symbol(), token.decimals()]);
  const amountAtomic = ethers.parseUnits(rewardHuman, decimals);
  const totalRequired = amountAtomic * BigInt(recipients.length);
  const senderBalance = senderAddress ? await token.balanceOf(senderAddress) : BigInt(0);
  const senderEth = senderAddress ? await provider.getBalance(senderAddress) : BigInt(0);

  const summary = {
    mode: execute ? "execute" : "dry-run",
    rewardRunId,
    token: { address: tokenAddress, name, symbol, decimals: Number(decimals) },
    senderAddress,
    senderBotaBalance: ethers.formatUnits(senderBalance, decimals),
    senderEthBalance: ethers.formatEther(senderEth),
    rewardAmountPerRecipient: rewardHuman,
    uniqueRecipients: recipients.length,
    totalRequiredBota: ethers.formatUnits(totalRequired, decimals),
    files: { recipientJson, recipientCsv },
  };
  console.log(JSON.stringify(summary, null, 2));

  if (!execute) return;
  if (!signer) throw new Error("Missing signer.");
  if (senderBalance < totalRequired) {
    throw new Error(
      `Insufficient BOTA. Need ${ethers.formatUnits(totalRequired, decimals)}, have ${ethers.formatUnits(senderBalance, decimals)}.`,
    );
  }
  if (senderEth <= BigInt(0)) throw new Error("Sender wallet has no Base ETH for gas.");

  const txs: Array<{ recipient: string; hash: string }> = [];
  for (const recipient of recipients) {
    console.log(`Sending ${rewardHuman} ${symbol} to ${recipient.address}...`);
    try {
      const tx = await token.transfer(recipient.address, amountAtomic);
      txs.push({ recipient: recipient.address, hash: tx.hash });
      console.log(`  tx: ${tx.hash}`);
      await tx.wait(confirmations);
    } catch (error) {
      const rawTx =
        (error as { payload?: { params?: string[] } })?.payload?.params?.[0] ||
        String((error as Error)?.message || "").match(/0x[a-fA-F0-9]{180,}/)?.[0];

      if (String((error as Error)?.message || error).includes("already known") && rawTx) {
        const hash = ethers.Transaction.from(rawTx).hash;
        console.log(`  tx already known: ${hash}`);
        const receipt = await provider.waitForTransaction(hash, confirmations, 180_000);
        if (!receipt || receipt.status !== 1) throw new Error(`Known transaction did not confirm successfully: ${hash}`);
        txs.push({ recipient: recipient.address, hash });
      } else {
        throw error;
      }
    }

    writeJson(`transfers-${rewardRunId}.partial.json`, { ...summary, txs });
  }

  const txJson = writeJson(`transfers-${rewardRunId}.json`, { ...summary, txs });
  console.log(JSON.stringify({ complete: true, transfers: txs.length, txJson }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
