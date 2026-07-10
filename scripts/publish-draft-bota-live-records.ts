import "dotenv/config";
import { Client } from "pg";
import { publishOnchainSimBattleRewardsForRecord } from "../server/onchainSimBattleClaimService";
import type { BotaArenaBattleRecord } from "../shared/botaArenaBattleRecord";

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

async function main() {
  const limit = Math.max(1, Math.min(Number(process.argv[2] || 10), 50));
  const chainId = Number(process.argv[3] || 8453);
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.SUPABASE_DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required.");

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const { rows } = await client.query(
    `
      SELECT r.*
      FROM bota_arena_battle_records r
      WHERE EXISTS (
        SELECT 1
        FROM onchain_sim_battle_reward_claims c
        WHERE c.record_id = r.id::text
          AND c.status = 'draft'
          AND c.battle_tx_hash IS NULL
          AND c.batch_tx_hash IS NULL
      )
      ORDER BY r.created_at ASC
      LIMIT $1
    `,
    [limit],
  );
  await client.end();

  const results: any[] = [];
  for (const row of rows) {
    const record = normalizeRecord(row);
    try {
      const published = await publishOnchainSimBattleRewardsForRecord({
        record,
        battle: record.battleSnapshot as any,
        chainId,
        execute: true,
      });
      results.push({
        recordId: record.id,
        battleId: record.battleId,
        title: record.title,
        mode: published.mode,
        configured: published.configured,
        totalBantCredits: published.totalBantCredits,
        claims: published.claims.length,
        recordTxHash: published.recordTxHash,
        rewardBatchTxHash: published.rewardBatchTxHash,
        skippedReason: published.skippedReason,
      });
    } catch (error: any) {
      results.push({
        recordId: record.id,
        battleId: record.battleId,
        title: record.title,
        error: error?.shortMessage || error?.message || String(error),
      });
    }
  }

  console.log(JSON.stringify({ requested: limit, processed: rows.length, results }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
