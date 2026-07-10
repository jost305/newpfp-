import "dotenv/config";
import axios from "axios";
import { Pool } from "pg";
import sharp from "sharp";
import TelegramBot from "node-telegram-bot-api";

const AXIOS_TIMEOUT_MS = 20_000;

type BattleRecordRow = {
  id: string;
  record_key: string;
  battle_id: string;
  source_battle_id: string | null;
  title: string;
  status: string;
  rounds: number;
  spectators: number;
  winner_agent_id: string | null;
  loser_agent_id: string | null;
  metadata: Record<string, unknown>;
  resolved_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

const DEFAULT_BASE_URL = "https://bota.bantah.fun";
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 100;

function envFlag(name: string, fallback = false) {
  const raw = String(process.env[name] || "").trim().toLowerCase();
  if (!raw) return fallback;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

function envInt(name: string, fallback: number) {
  const parsed = Number.parseInt(String(process.env[name] || "").trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function publicBaseUrl() {
  const raw = String(
    process.env.BOTA_PUBLIC_BASE_URL ||
      process.env.PUBLIC_APP_URL ||
      process.env.FRONTEND_URL ||
      DEFAULT_BASE_URL,
  ).trim();
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return DEFAULT_BASE_URL;
  }
}

function html(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function asDate(value: Date | string | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value: Date | string | null | undefined) {
  const date = asDate(value);
  if (!date) return "Recorded";
  return date.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

function metadataName(row: BattleRecordRow, key: string, fallback: string) {
  const value = row.metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function recordPostId(row: BattleRecordRow) {
  return `telegram-bota-battle-archive-${row.id}`;
}

function shareCardUrl(row: BattleRecordRow, baseUrl: string) {
  const version = encodeURIComponent(
    String(row.updated_at || row.resolved_at || row.created_at || row.id),
  );
  return `${baseUrl}/api/bota/share-card/result/${encodeURIComponent(row.id)}.png?v=${version}`;
}

function resultUrl(row: BattleRecordRow, baseUrl: string) {
  const query = new URLSearchParams({
    section: "arena",
    result: row.id,
  });
  if (row.source_battle_id || row.battle_id) {
    query.set("battle", row.source_battle_id || row.battle_id);
  }
  return `${baseUrl}/?${query.toString()}`;
}

function captionForRecord(row: BattleRecordRow) {
  const winner = metadataName(row, "winnerName", "Winner");
  const loser = metadataName(row, "loserName", "Opponent");
  const status = row.status === "draw" ? "Draw" : `${winner} defeated ${loser}`;
  return [
    "<b>BOTA Arena Archive</b>",
    "",
    `<b>${html(row.title)}</b>`,
    html(status),
    "",
    `Rounds: <b>${html(row.rounds)}</b>`,
    `Spectators: <b>${html(row.spectators)}</b>`,
    `Recorded: <b>${html(formatDate(row.resolved_at || row.created_at))}</b>`,
  ].join("\n");
}

async function ensureFeedTable(pool: Pool) {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS bantah_telegram_feed_posts (
       id text PRIMARY KEY,
       post jsonb NOT NULL,
       created_at timestamp NOT NULL DEFAULT now(),
       updated_at timestamp NOT NULL DEFAULT now()
     )`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_bantah_telegram_feed_posts_updated
       ON bantah_telegram_feed_posts (updated_at DESC)`,
  );
}

async function loadRows(pool: Pool, limit: number) {
  const result = await pool.query<BattleRecordRow>(
    `SELECT id, record_key, battle_id, source_battle_id, title, status, rounds, spectators,
            winner_agent_id, loser_agent_id, metadata, resolved_at, created_at, updated_at
       FROM bota_arena_battle_records
      ORDER BY created_at ASC
      LIMIT $1`,
    [Math.max(1, Math.min(limit, MAX_LIMIT))],
  );
  return result.rows;
}

async function loadAlreadyPosted(pool: Pool, ids: string[]) {
  if (ids.length === 0) return new Set<string>();
  const result = await pool.query<{ id: string }>(
    `SELECT id FROM bantah_telegram_feed_posts WHERE id = ANY($1::text[])`,
    [ids],
  );
  return new Set(result.rows.map((row) => row.id));
}

async function renderCoverPng(url: string) {
  const response = await axios.get<ArrayBuffer>(url, {
    responseType: "arraybuffer",
    timeout: AXIOS_TIMEOUT_MS,
    headers: {
      "User-Agent": "BOTA-Telegram-Archive-Backfill/1.0",
    },
  });
  return sharp(Buffer.from(response.data)).png().toBuffer();
}

async function persistFeedPost(pool: Pool, row: BattleRecordRow, baseUrl: string) {
  const winner = metadataName(row, "winnerName", "Winner");
  const loser = metadataName(row, "loserName", "Opponent");
  const post = {
    id: recordPostId(row),
    user: "BantahBro Official",
    avatar: "BOTA",
    handle: "BantahBroOfficial",
    timestamp: new Date().toISOString(),
    content: [
      "BOTA Arena Archive",
      row.title,
      row.status === "draw" ? "Draw" : `${winner} defeated ${loser}`,
      `${row.rounds} rounds`,
    ].join("\n"),
    market: row.title,
    marketEmoji: "BOTA",
    likes: 0,
    comments: 0,
    tags: ["BOTA", "Arena", "Archive", "Battle"],
    source: "telegram",
    url: resultUrl(row, baseUrl),
  };

  await pool.query(
    `INSERT INTO bantah_telegram_feed_posts (id, post, created_at, updated_at)
       VALUES ($1, $2::jsonb, now(), now())
       ON CONFLICT (id)
       DO UPDATE SET post = excluded.post, updated_at = excluded.updated_at`,
    [post.id, JSON.stringify(post)],
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const databaseUrl = String(process.env.DATABASE_URL || "").trim();
  const token = String(process.env.BANTAHBRO_TELEGRAM_BOT_TOKEN || "").trim();
  const channelId = String(process.env.BANTAHBRO_TELEGRAM_CHANNEL_ID || "").trim();
  const dryRun = envFlag("BOTA_TELEGRAM_BACKFILL_DRY_RUN", false);
  const limit = envInt("BOTA_TELEGRAM_BACKFILL_LIMIT", DEFAULT_LIMIT);
  const delayMs = envInt("BOTA_TELEGRAM_BACKFILL_DELAY_MS", 1200);
  const baseUrl = publicBaseUrl();

  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  if (!dryRun && (!token || !channelId)) {
    throw new Error("BANTAHBRO_TELEGRAM_BOT_TOKEN and BANTAHBRO_TELEGRAM_CHANNEL_ID are required.");
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await ensureFeedTable(pool);
    const rows = await loadRows(pool, limit);
    const posted = await loadAlreadyPosted(pool, rows.map(recordPostId));
    const pending = rows.filter((row) => !posted.has(recordPostId(row)));
    const bot = dryRun ? null : new TelegramBot(token, { polling: false });
    let sent = 0;
    let skipped = rows.length - pending.length;
    let failed = 0;

    console.log(
      JSON.stringify(
        {
          baseUrl,
          dryRun,
          totalLoaded: rows.length,
          alreadyPosted: skipped,
          pending: pending.length,
        },
        null,
        2,
      ),
    );

    for (const row of pending) {
      const coverUrl = shareCardUrl(row, baseUrl);
      const url = resultUrl(row, baseUrl);
      console.log(`${dryRun ? "DRY" : "POST"} ${row.title} ${coverUrl}`);

      if (!dryRun && bot) {
        try {
          const png = await renderCoverPng(coverUrl);
          await Promise.race([
            bot.sendPhoto(
              channelId,
              png,
              {
                caption: captionForRecord(row),
                parse_mode: "HTML",
                reply_markup: {
                  inline_keyboard: [[{ text: "View Result", url }]],
                },
              },
              {
                filename: `bota-arena-${row.id}.png`,
                contentType: "image/png",
              },
            ),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Telegram send timed out")), AXIOS_TIMEOUT_MS),
            ),
          ]);
          await persistFeedPost(pool, row, baseUrl);
          sent += 1;
          if (delayMs > 0) await sleep(delayMs);
        } catch (error) {
          failed += 1;
          console.warn(`FAILED ${row.title}:`, error instanceof Error ? error.message : error);
        }
      }
    }

    console.log(JSON.stringify({ sent, skipped, failed, pending: pending.length }, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
