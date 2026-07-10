import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BROWSER_EXECUTABLES = [
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
];
const OUTPUT_DIR = path.resolve(__dirname, "..", "artifacts", "bota-mobile-screenshots");
const BASE_URL = process.env.BOTA_SCREENSHOT_URL || "https://bota.bantah.fun";

const TARGETS = [
  { key: "01-arena", url: `${BASE_URL}?section=battles`, waitFor: /BantCredit|Spectators|VS/i },
  { key: "02-agents", url: `${BASE_URL}?section=agents`, waitFor: /acp-trend-agent|AgentCheck|Virtuals Protocol|Bankr|ElizaOS/i },
  { key: "03-leaderboard", url: `${BASE_URL}?section=leaderboard`, waitFor: /\bpts\b|acp-trend-agent|AgentCheck/i },
  { key: "04-rewards", url: `${BASE_URL}?section=rewards`, waitFor: /Rewards|BantCredit|BANTC/i },
  { key: "05-import", url: `${BASE_URL}?section=import`, waitFor: /Import Agent|Scan|ENS|NFT/i },
];

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function launchBrowser() {
  const options = {
    headless: true,
    args: ["--disable-web-security"],
  };

  for (const executablePath of BROWSER_EXECUTABLES) {
    if (await fileExists(executablePath)) {
      return chromium.launch({ ...options, executablePath });
    }
  }

  return chromium.launch(options);
}

async function waitForTarget(page, target) {
  await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  try {
    await page.waitForLoadState("networkidle", { timeout: 10_000 });
  } catch {
    // The live arena polls APIs, so networkidle may not settle. Text checks below are the real readiness signal.
  }

  await page.waitForFunction(
    (patternSource) => {
      const pattern = new RegExp(patternSource, "i");
      return pattern.test(document.body?.innerText || "");
    },
    target.waitFor.source,
    { timeout: 45_000 },
  );

  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  });
  await page.waitForTimeout(2_500);
}

async function main() {
  await ensureDir(OUTPUT_DIR);
  const existingFiles = await fs.readdir(OUTPUT_DIR);
  await Promise.all(
    existingFiles
      .filter((file) => file.endsWith(".png") || file === "manifest.json")
      .map((file) => fs.rm(path.join(OUTPUT_DIR, file), { force: true })),
  );

  const browser = await launchBrowser();

  try {
    const context = await browser.newContext({
      viewport: { width: 430, height: 932 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
      colorScheme: "dark",
      reducedMotion: "reduce",
    });

    await context.addInitScript(() => {
      localStorage.setItem("a2hs_shown_v1", "1");
      localStorage.setItem("bota.game.soundEnabled", "false");
      localStorage.setItem("bantahbro:music-enabled", "false");
    });

    const page = await context.newPage();

    for (const target of TARGETS) {
      await waitForTarget(page, target);
      const outputPath = path.join(OUTPUT_DIR, `${target.key}.png`);
      await page.screenshot({
        path: outputPath,
        fullPage: false,
        animations: "disabled",
        caret: "hide",
      });
      console.log(`[capture] ${target.key} -> ${outputPath}`);
    }

    await context.close();
  } finally {
    await browser.close();
  }

  console.log(`[capture] done: ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
