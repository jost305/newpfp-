import "dotenv/config";
import { pool } from "../server/db.ts";
import { simulateBotaArenaBattleFromLiveBattle } from "../server/bantahBro/botaArenaEngine.ts";
import { publishOnchainSimBattleRewardsForRecord } from "../server/onchainSimBattleClaimService.ts";
import { botaArenaBattleRecordSchema, type BotaArenaBattleRecord } from "../shared/botaArenaBattleRecord.ts";
import type { BantahBroAgentBattle } from "../server/bantahBro/agentBattleService.ts";

const TARGET = Math.max(1, Math.min(Number(process.env.RECORD_SIM_BATTLE_TARGET || 23), 50));
const CHAIN_ID = Number(process.env.RECORD_SIM_BATTLE_CHAIN_ID || 8453);
const EXECUTE = String(process.env.RECORD_SIM_BATTLE_EXECUTE || "false").toLowerCase() === "true";
const FEED_URL =
  process.env.RECORD_SIM_BATTLE_FEED_URL ||
  `https://bota.bantah.fun/api/bantahbro/agent-battles/live?limit=50`;

function normalizeRecordKey(value: string) {
  return String(value || "bota-arena-record")
    .trim()
    .replace(/[^a-zA-Z0-9:_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 360);
}

function statusForSimulation(input: { status: string; winnerSideId: string | null }) {
  if (input.status === "draw") return "draw";
  if (input.winnerSideId) return "resolved";
  return "invalid";
}

function toDateOrNull(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIso(value: Date | string | null | undefined) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

async function fetchLiveBattles() {
  const response = await fetch(FEED_URL);
  if (!response.ok) {
    throw new Error(`Live battle feed failed: ${response.status} ${response.statusText}`);
  }
  const payload = await response.json();
  const battles = Array.isArray(payload?.battles) ? payload.battles : [];
  return battles as BantahBroAgentBattle[];
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

async function ensureBattleRecord(battle: BantahBroAgentBattle): Promise<{
  record: BotaArenaBattleRecord;
  inserted: boolean;
}> {
  const seed = `${battle.id}:${battle.startsAt}`.slice(0, 255);
  const recordKey = normalizeRecordKey(
    `${battle.id}:seed:${seed}:rounds:5:arena:bota-main`,
  );

  const existing = await pool.query(
    `
      select *
      from bota_arena_battle_records
      where record_key = $1
      limit 1
    `,
    [recordKey],
  );
  if (existing.rows[0]) {
    return { record: rowToRecord(existing.rows[0]), inserted: false };
  }

  const simulation = await simulateBotaArenaBattleFromLiveBattle(battle, {
    seed,
    maxRounds: 5,
  });
  const winnerSideId = simulation.finalState.winnerId || null;
  const winnerSide = winnerSideId
    ? battle.sides.find((side) => side.id === winnerSideId) || null
    : null;
  const loserSide = winnerSideId
    ? battle.sides.find((side) => side.id !== winnerSideId) || null
    : null;
  const now = new Date();

  const inserted = await pool.query(
    `
      insert into bota_arena_battle_records (
        record_key,
        battle_id,
        source_battle_id,
        title,
        arena_id,
        status,
        winner_agent_id,
        winner_side_id,
        loser_agent_id,
        loser_side_id,
        provider,
        adapter_version,
        engine_version,
        seed,
        rounds,
        spectators,
        fighters,
        round_log,
        simulation,
        battle_snapshot,
        metadata,
        started_at,
        ended_at,
        resolved_at,
        updated_at
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17::jsonb, $18::jsonb,
        $19::jsonb, $20::jsonb, $21::jsonb, $22, $23, $24, $25
      )
      on conflict (record_key) do nothing
      returning *
    `,
    [
      recordKey,
      battle.id,
      battle.id,
      battle.title,
      "bota-main",
      statusForSimulation({ status: simulation.finalState.status, winnerSideId }),
      winnerSide?.id || null,
      winnerSideId,
      loserSide?.id || null,
      loserSide?.id || null,
      simulation.provider,
      simulation.adapterVersion,
      simulation.engineVersion,
      seed,
      simulation.finalState.round,
      Math.max(0, Math.round(Number(battle.spectators || 0))),
      JSON.stringify(simulation.finalState.fighters || []),
      JSON.stringify(simulation.finalState.log || []),
      JSON.stringify(simulation),
      JSON.stringify(battle),
      JSON.stringify({
        winnerName: winnerSide?.agentName || null,
        loserName: loserSide?.agentName || null,
        resolutionReason: simulation.finalState.resolutionReason,
      }),
      toDateOrNull(battle.startsAt),
      toDateOrNull(battle.endsAt),
      now,
      now,
    ],
  );

  if (inserted.rows[0]) {
    return { record: rowToRecord(inserted.rows[0]), inserted: true };
  }

  const afterConflict = await pool.query(
    `
      select *
      from bota_arena_battle_records
      where record_key = $1
      limit 1
    `,
    [recordKey],
  );
  if (!afterConflict.rows[0]) throw new Error(`Battle record was not stored for ${battle.id}`);
  return { record: rowToRecord(afterConflict.rows[0]), inserted: false };
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

try {
  const battles = await fetchLiveBattles();
  const alreadyPublished = await existingOnchainBattleIds();
  const summary = {
    target: TARGET,
    execute: EXECUTE,
    chainId: CHAIN_ID,
    liveBattles: battles.length,
    recorded: 0,
    skipped: 0,
    errors: 0,
    results: [] as Array<Record<string, unknown>>,
  };

  for (const battle of battles) {
    if (summary.recorded >= TARGET) break;
    if (alreadyPublished.has(battle.id)) {
      summary.skipped += 1;
      summary.results.push({ battleId: battle.id, status: "skipped-already-published" });
      continue;
    }

    try {
      const stored = await ensureBattleRecord(battle);
      const published = await publishOnchainSimBattleRewardsForRecord({
        record: stored.record,
        battle,
        chainId: CHAIN_ID,
        execute: EXECUTE,
      });

      if (published.skippedReason) {
        summary.skipped += 1;
        summary.results.push({
          battleId: battle.id,
          recordId: stored.record.id,
          status: "skipped",
          reason: published.skippedReason,
        });
        continue;
      }

      summary.recorded += 1;
      summary.results.push({
        battleId: battle.id,
        recordId: stored.record.id,
        title: battle.title,
        inserted: stored.inserted,
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
        battleId: battle.id,
        status: "error",
        error: error?.message || String(error),
      });
      console.error(`[error] ${battle.id}: ${error?.message || error}`);
    }
  }

  console.log(`SUMMARY ${JSON.stringify(summary, null, 2)}`);
} finally {
  await pool.end();
}
