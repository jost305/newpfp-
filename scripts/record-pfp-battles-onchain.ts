import "dotenv/config";
import { pool } from "../server/db.ts";
import { publishOnchainSimBattleRewardsForRecord } from "../server/onchainSimBattleClaimService.ts";
import { botaArenaBattleRecordSchema, type BotaArenaBattleRecord } from "../shared/botaArenaBattleRecord.ts";
import type { BantahBroAgentBattle } from "../server/bantahBro/agentBattleService.ts";

const TARGET = Math.max(1, Math.min(Number(process.env.RECORD_SIM_BATTLE_TARGET || 23), 50));
const CHAIN_ID = Number(process.env.RECORD_SIM_BATTLE_CHAIN_ID || 8453);
const EXECUTE = String(process.env.RECORD_SIM_BATTLE_EXECUTE || "false").toLowerCase() === "true";

function toIso(value: Date | string | null | undefined) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function rowToRecord(row: Record<string, any>): BotaArenaBattleRecord {
  return botaArenaBattleRecordSchema.parse({
    id: String(row.id),
    recordKey: row.record_key,
    battleId: row.battle_id,
    sourceBattleId: row.source_battle_id,
    title: row.title,
    arenaId: row.arena_id,
    status: row.status,
    winnerAgentId: row.winner_agent_id,
    winnerSideId: row.winner_side_id,
    loserAgentId: row.loser_agent_id,
    loserSideId: row.loser_side_id,
    provider: row.provider,
    adapterVersion: row.adapter_version,
    engineVersion: row.engine_version,
    seed: row.seed,
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
  });
}

async function existingOnchainBattleIds() {
  const exists = await pool.query("select to_regclass('public.onchain_sim_battle_reward_claims') as name");
  if (!exists.rows[0]?.name) return new Set<string>();
  const result = await pool.query(
    `
      select distinct battle_id
      from onchain_sim_battle_reward_claims
      where chain_id = $1
        and (battle_tx_hash is not null or batch_tx_hash is not null)
    `,
    [CHAIN_ID],
  );
  return new Set(result.rows.map((row) => String(row.battle_id)));
}

async function run() {
  try {
    const alreadyPublished = await existingOnchainBattleIds();
    const summary = {
      target: TARGET,
      execute: EXECUTE,
      chainId: CHAIN_ID,
      recorded: 0,
      skipped: 0,
      errors: 0,
      results: [] as Array<Record<string, unknown>>,
    };

    const unrecordedBattlesQuery = await pool.query(`
      SELECT * FROM bota_arena_battle_records
      WHERE arena_id = 'pfp-arena'
      ORDER BY created_at DESC
      LIMIT 100
    `);

    for (const row of unrecordedBattlesQuery.rows) {
      if (summary.recorded >= TARGET) break;
      const battleId = row.battle_id;

      if (alreadyPublished.has(battleId)) {
        summary.skipped += 1;
        summary.results.push({ battleId, status: "skipped-already-published" });
        continue;
      }

      try {
        const record = rowToRecord(row);
        const battle = row.battle_snapshot as BantahBroAgentBattle;
        
        // ensure side is treated as external source so resolvePrimaryRewardOwner can parse it
        battle.sides.forEach(s => {
          if (!s.dexId && !s.chainId) {
            s.chainId = "8453"; // Fake base chain id so externalAgentSourceKey processes it
            s.dexId = "pfp-local";
          }
        });

        const published = await publishOnchainSimBattleRewardsForRecord({
          record,
          battle,
          chainId: CHAIN_ID,
          execute: EXECUTE,
        });

        if (published.skippedReason) {
          summary.skipped += 1;
          summary.results.push({
            battleId,
            recordId: record.id,
            status: "skipped",
            reason: published.skippedReason,
          });
          continue;
        }

        summary.recorded += 1;
        summary.results.push({
          battleId,
          recordId: record.id,
          title: battle.title,
          inserted: false,
          mode: published.mode,
          totalBantCredits: published.totalBantCredits,
          claims: published.claims.length,
          recordTxHash: published.recordTxHash,
          rewardBatchTxHash: published.rewardBatchTxHash,
        });
        console.log(
          `[${summary.recorded}/${TARGET}] ${battle.title} ${published.mode}` +
            ` record=${published.recordTxHash || "none"} batch=${published.rewardBatchTxHash || "none"}`,
        );
      } catch (error: any) {
        summary.errors += 1;
        summary.results.push({
          battleId,
          status: "error",
          error: error?.message || String(error),
        });
        console.error(`[error] ${battleId}: ${error?.message || error}`);
      }
    }

    console.log(`SUMMARY ${JSON.stringify(summary, null, 2)}`);
  } finally {
    await pool.end();
  }
}

run();
