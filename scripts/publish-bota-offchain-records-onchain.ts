import "dotenv/config";
import { Client } from "pg";
import { ethers } from "ethers";
import { publishOnchainSimBattleRewardsForRecord } from "../server/onchainSimBattleClaimService";
import { getOnchainServerConfig } from "../server/onchainConfig";
import { pool } from "../server/db";
import type { BotaArenaBattleRecord } from "../shared/botaArenaBattleRecord";

function argValue(name: string) {
  const exact = process.argv.find((arg) => arg === name);
  if (exact) return "true";
  const prefix = `${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : "";
}

function boolArg(name: string, fallback: boolean) {
  const raw = (argValue(name) || "").trim().toLowerCase();
  if (!raw) return fallback;
  return ["1", "true", "yes", "on"].includes(raw);
}

function intArg(name: string, fallback: number, min: number, max: number) {
  const rawText = String(argValue(name) || process.env[name.replace(/^--/, "").replace(/-/g, "_").toUpperCase()] || "").trim();
  if (!rawText) return fallback;
  const raw = Number(rawText);
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(min, Math.min(Math.round(raw), max));
}

function stringArg(name: string, fallback = "") {
  return String(argValue(name) || fallback || "").trim();
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeRecord(row: any): BotaArenaBattleRecord {
  return {
    id: String(row.id),
    recordKey: String(row.record_key),
    battleId: String(row.battle_id),
    sourceBattleId: row.source_battle_id ? String(row.source_battle_id) : null,
    title: String(row.title),
    arenaId: row.arena_id ? String(row.arena_id) : null,
    status: row.status,
    winnerAgentId: row.winner_agent_id ? String(row.winner_agent_id) : null,
    winnerSideId: row.winner_side_id ? String(row.winner_side_id) : null,
    loserAgentId: row.loser_agent_id ? String(row.loser_agent_id) : null,
    loserSideId: row.loser_side_id ? String(row.loser_side_id) : null,
    provider: row.provider,
    adapterVersion: String(row.adapter_version),
    engineVersion: String(row.engine_version),
    seed: String(row.seed),
    rounds: Number(row.rounds || 0),
    spectators: Number(row.spectators || 0),
    fighters: Array.isArray(row.fighters) ? row.fighters : [],
    roundLog: Array.isArray(row.round_log) ? row.round_log : [],
    simulation: row.simulation || {},
    battleSnapshot: row.battle_snapshot || {},
    metadata: row.metadata || {},
    startedAt: toIso(row.started_at),
    endedAt: toIso(row.ended_at),
    resolvedAt: toIso(row.resolved_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function configuredPrivateKeys() {
  return [
    process.env.ONCHAIN_SIM_REWARDS_PRIVATE_KEY,
    process.env.BANTCREDIT_REWARDS_PRIVATE_KEY,
    process.env.PRIVATE_KEY,
    process.env.PLATFORM_PRIVATE_KEY,
    process.env.ADMIN_PRIVATE_KEY,
    process.env.TESTNET_ADMIN_PRIVATE_KEY,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

function resolveChainConfig(chainId: number) {
  const config = getOnchainServerConfig();
  return (
    config.chains[String(chainId)] ||
    config.chains[String(config.defaultChainId)] ||
    config.chains[String(config.chainId)] ||
    null
  );
}

async function resolveOwnerWallet(provider: ethers.JsonRpcProvider, registryAddress: string) {
  const ownerAbi = ["function owner() view returns (address)"];
  const owner = await new ethers.Contract(registryAddress, ownerAbi, provider).owner();
  for (const privateKey of configuredPrivateKeys()) {
    try {
      const wallet = new ethers.Wallet(privateKey, provider);
      if (wallet.address.toLowerCase() === String(owner).toLowerCase()) return wallet;
    } catch {
      // Ignore optional invalid key candidates.
    }
  }
  throw new Error(`No configured private key matches SimBattleRegistry owner ${owner}.`);
}

async function main() {
  const target = intArg("--target", Number(process.env.BOTA_BACKFILL_ONCHAIN_TARGET || 1000), 1, 5000);
  const scanLimit = intArg("--scan-limit", Math.max(target + 50, target), target, 10000);
  const pageSize = intArg("--page-size", Number(process.env.BOTA_BACKFILL_PAGE_SIZE || 25), 1, 100);
  const chainId = intArg("--chain-id", Number(process.env.BOTA_BACKFILL_ONCHAIN_CHAIN_ID || 8453), 1, Number.MAX_SAFE_INTEGER);
  const execute = boolArg("--execute", false);
  const minBalanceEth = stringArg("--min-balance-eth", process.env.BOTA_BACKFILL_MIN_BALANCE_ETH || "0.00002");
  const chain = resolveChainConfig(chainId);
  const registryAddress = String(chain?.simBattleRegistryAddress || "").trim();
  const rpcUrl = String(chain?.rpcUrl || "").trim();
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.SUPABASE_DATABASE_URL;

  if (!connectionString) throw new Error("DATABASE_URL is required.");
  if (!chain) throw new Error(`No onchain config is available for chain ${chainId}.`);
  if (!rpcUrl) throw new Error(`RPC URL is required for ${chain.name}.`);
  if (!registryAddress || !ethers.isAddress(registryAddress)) {
    throw new Error(`SIM_BATTLE_REGISTRY_ADDRESS is required for ${chain.name}.`);
  }

  async function withClient<T>(fn: (client: Client) => Promise<T>) {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();
    try {
      return await fn(client);
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  async function countEligible() {
    return withClient(async (client) => {
      const result = await client.query(
        `
        SELECT count(*)::int AS count
        FROM bota_arena_battle_records r
        WHERE r.status IN ('resolved', 'draw')
          AND NOT EXISTS (
            SELECT 1
            FROM onchain_sim_battle_reward_claims c
            WHERE c.record_id = r.id::text
              AND c.chain_id = $1
              AND c.battle_tx_hash IS NOT NULL
              AND c.batch_tx_hash IS NOT NULL
          )
      `,
        [chainId],
      );
      return Number(result.rows[0]?.count || 0);
    });
  }

  async function fetchEligibleRows(excludedRecordIds: string[], limit: number) {
    return withClient(async (client) => {
      const result = await client.query(
        `
      SELECT r.*
      FROM bota_arena_battle_records r
      WHERE r.status IN ('resolved', 'draw')
        AND NOT EXISTS (
          SELECT 1
          FROM onchain_sim_battle_reward_claims c
          WHERE c.record_id = r.id::text
            AND c.chain_id = $3
            AND c.battle_tx_hash IS NOT NULL
            AND c.batch_tx_hash IS NOT NULL
        )
        AND NOT (r.id::text = ANY($2::text[]))
      ORDER BY r.created_at ASC
      LIMIT $1
    `,
        [limit, excludedRecordIds, chainId],
      );
      return result.rows;
    });
  }

  const eligibleCount = await countEligible();
  if (!execute) {
    const previewRows = await fetchEligibleRows([], Math.min(5, pageSize));
    console.log(
      `SUMMARY ${JSON.stringify(
        {
          target,
          scanLimit,
          pageSize,
          selected: Math.min(eligibleCount, scanLimit),
          eligibleCount,
          execute,
          chainId,
          preview: previewRows.map((row) => ({
            recordId: String(row.id),
            battleId: String(row.battle_id),
            title: String(row.title),
          })),
        },
        null,
        2,
      )}`,
    );
    return;
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl, chainId, { staticNetwork: true });
  const ownerWallet = await resolveOwnerWallet(provider, registryAddress);
  const minBalance = ethers.parseEther(minBalanceEth);
  const seenRecordIds = new Set<string>();

  const summary = {
    target,
    scanLimit,
    pageSize,
    eligibleCount,
    selected: 0,
    execute,
    chainId,
    owner: ownerWallet?.address || null,
    minBalanceEth,
    recorded: 0,
    skipped: 0,
    failed: 0,
    stoppedReason: null as string | null,
    results: [] as Array<Record<string, unknown>>,
  };

  while (summary.recorded < target && summary.selected < scanLimit) {
    const rows = await fetchEligibleRows(Array.from(seenRecordIds), Math.min(pageSize, scanLimit - summary.selected));
    if (!rows.length) {
      summary.stoppedReason = summary.stoppedReason || "No more eligible rows selected.";
      break;
    }
    summary.selected += rows.length;

    for (const row of rows) {
      if (summary.recorded >= target) break;
      seenRecordIds.add(String(row.id));
      const balance = await provider.getBalance(ownerWallet.address);
      if (balance < minBalance) {
        summary.stoppedReason = `Owner wallet gas below ${minBalanceEth} ETH`;
        break;
      }

      const record = normalizeRecord(row);
      try {
        const published = await publishOnchainSimBattleRewardsForRecord({
          record,
          battle: record.battleSnapshot as any,
          chainId,
          execute: true,
        });

        if (published.skippedReason) {
          summary.skipped += 1;
          summary.results.push({
            recordId: record.id,
            battleId: record.battleId,
            title: record.title,
            status: "skipped",
            reason: published.skippedReason,
          });
          continue;
        }

        summary.recorded += 1;
        summary.results.push({
          recordId: record.id,
          battleId: record.battleId,
          title: record.title,
          status: "recorded",
          mode: published.mode,
          claims: published.claims.length,
          totalBantCredits: published.totalBantCredits,
          recordTxHash: published.recordTxHash,
          rewardBatchTxHash: published.rewardBatchTxHash,
        });
        console.log(
          `[${summary.recorded}/${target}] ${record.title} record=${published.recordTxHash} batch=${published.rewardBatchTxHash}`,
        );
      } catch (error: any) {
        summary.failed += 1;
        summary.results.push({
          recordId: record.id,
          battleId: record.battleId,
          title: record.title,
          status: "error",
          error: error?.shortMessage || error?.message || String(error),
        });
        console.error(`[error] ${record.battleId}: ${error?.shortMessage || error?.message || error}`);
      }
    }

    if (summary.stoppedReason) break;
  }

  console.log(`SUMMARY ${JSON.stringify(summary, null, 2)}`);
}

main()
  .catch((error) => {
    console.error(error?.stack || error?.message || String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
