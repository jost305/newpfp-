import { network } from "hardhat";
import { ethers } from "ethers";

function envKeyForChain(
  chainId: number,
  chainName: string,
  suffix: string,
): string {
  const keyByChainId: Record<number, string> = {
    84532: `ONCHAIN_BASE_SEPOLIA_${suffix}`,
    97: `ONCHAIN_BSC_TESTNET_${suffix}`,
    421614: `ONCHAIN_ARBITRUM_SEPOLIA_${suffix}`,
    56: `ONCHAIN_BSC_${suffix}`,
    44787: `ONCHAIN_CELO_ALFAJORES_${suffix}`,
    42220: `ONCHAIN_CELO_${suffix}`,
    11142220: `ONCHAIN_CELO_SEPOLIA_${suffix}`,
    1301: `ONCHAIN_UNICHAIN_SEPOLIA_${suffix}`,
    130: `ONCHAIN_UNICHAIN_${suffix}`,
    8453: `ONCHAIN_BASE_${suffix}`,
    42161: `ONCHAIN_ARBITRUM_${suffix}`,
  };

  return keyByChainId[chainId] || `ONCHAIN_${chainName.toUpperCase()}_${suffix}`;
}

async function main() {
  const { ethers: hardhatEthers } = await network.connect();
  const provider = hardhatEthers.provider;
  const adminPrivateKey = String(process.env.ADMIN_PRIVATE_KEY || "").trim();
  if (!adminPrivateKey) {
    throw new Error("No deployer account available. Set ADMIN_PRIVATE_KEY in .env");
  }

  const deployer = new ethers.Wallet(adminPrivateKey, provider);
  const ownerFromEnv = String(process.env.ADMIN_ADDRESS || "").trim();
  const owner = ownerFromEnv || deployer.address;

  const chainInfo = await deployer.provider.getNetwork();
  const chainId = Number(chainInfo.chainId);
  const argNetworkIndex = process.argv.findIndex((arg) => arg === "--network");
  const networkFromArgs =
    argNetworkIndex >= 0 && process.argv[argNetworkIndex + 1]
      ? String(process.argv[argNetworkIndex + 1]).trim()
      : "";
  const networkFromEnv = String(process.env.HARDHAT_NETWORK || "").trim();
  const chainName = networkFromArgs || networkFromEnv || `chain-${chainId}`;

  const bantCreditsEnvKey = envKeyForChain(chainId, chainName, "BANTCREDITS_ADDRESS");
  const simRegistryEnvKey = envKeyForChain(chainId, chainName, "SIM_BATTLE_REGISTRY_ADDRESS");
  const rewardsEnvKey = envKeyForChain(chainId, chainName, "BANTCREDIT_REWARDS_ADDRESS");

  console.log(`Deploying simulated battle rewards stack on ${chainName} (chainId=${chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Owner: ${owner}`);

  const BantCreditsFactory = await hardhatEthers.getContractFactory("BantCredits", deployer);
  const bantCredits = await BantCreditsFactory.deploy(owner);
  await bantCredits.waitForDeployment();
  const bantCreditsAddress = await bantCredits.getAddress();

  const SimBattleRegistryFactory = await hardhatEthers.getContractFactory("SimBattleRegistry", deployer);
  const simBattleRegistry = await SimBattleRegistryFactory.deploy(owner);
  await simBattleRegistry.waitForDeployment();
  const simBattleRegistryAddress = await simBattleRegistry.getAddress();

  const BantCreditRewardsFactory = await hardhatEthers.getContractFactory("BantCreditRewards", deployer);
  const bantCreditRewards = await BantCreditRewardsFactory.deploy(owner, bantCreditsAddress);
  await bantCreditRewards.waitForDeployment();
  const bantCreditRewardsAddress = await bantCreditRewards.getAddress();

  console.log("Authorizing BantCreditRewards as BantCredits minter...");
  const minterTx = await bantCredits.setMinter(bantCreditRewardsAddress, true);
  await minterTx.wait();

  console.log("===============================================");
  console.log(`BantCredits deployed: ${bantCreditsAddress}`);
  console.log(`SimBattleRegistry deployed: ${simBattleRegistryAddress}`);
  console.log(`BantCreditRewards deployed: ${bantCreditRewardsAddress}`);
  console.log(`BantCredits tx hash: ${bantCredits.deploymentTransaction()?.hash || "unknown"}`);
  console.log(`SimBattleRegistry tx hash: ${simBattleRegistry.deploymentTransaction()?.hash || "unknown"}`);
  console.log(`BantCreditRewards tx hash: ${bantCreditRewards.deploymentTransaction()?.hash || "unknown"}`);
  console.log(`Minter authorization tx hash: ${minterTx.hash}`);
  console.log("Set these envs for the corresponding chain:");
  console.log(`${bantCreditsEnvKey}=${bantCreditsAddress}`);
  console.log(`${simRegistryEnvKey}=${simBattleRegistryAddress}`);
  console.log(`${rewardsEnvKey}=${bantCreditRewardsAddress}`);
  console.log("===============================================");
}

main().catch((error) => {
  console.error("Sim rewards deployment failed:", error);
  process.exitCode = 1;
});
