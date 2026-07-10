export type BotaDerivativeTraitInput =
  | string
  | {
      name?: string | null;
      value?: string | number | boolean | null;
      trait_type?: string | null;
      traitType?: string | null;
    };

export type BotaDerivativeFighterInput = {
  collection?: string | null;
  tokenId?: string | number | null;
  traits?: BotaDerivativeTraitInput[] | Record<string, unknown> | null;
  rarity?: string | number | null;
  seed?: string | null;
};

export type BotaDerivativeFighter = {
  version: "bdf-v1";
  isDerivative: true;
  species: string;
  speciesLabel: string;
  collection: string;
  collectionLabel: string;
  sourceTokenId: string | null;
  fighterSkin: string;
  colorway: string;
  rarityTier: "common" | "rare" | "epic" | "legendary";
  fighterRig: "bantah-mascot" | "bantah-quadruped" | "bantah-winged";
  visualRule: "70-bantah-30-collection";
  stats: {
    hp: number;
    energy: number;
    speed: number;
    power: number;
    defense: number;
    focus: number;
  };
  accessories: string[];
  abilities: Array<{
    id: string;
    name: string;
    role: "attack" | "defense" | "utility";
    element: "spark" | "water" | "flame" | "smoke" | "shadow" | "signal";
  }>;
  titles: string[];
  tags: string[];
};

const COLLECTION_SPECIES: Array<{
  match: RegExp;
  species: string;
  speciesLabel: string;
  rig: BotaDerivativeFighter["fighterRig"];
  defaultSkin: string;
  accessories: string[];
  abilities: BotaDerivativeFighter["abilities"];
}> = [
  {
    match: /\b(crypto\s*kitt(y|ies)|kitt(y|ies))\b/i,
    species: "bantah-kittie",
    speciesLabel: "BantahKittie",
    rig: "bantah-quadruped",
    defaultSkin: "patchwork-fur",
    accessories: ["cat ears", "blocky tail", "whisker visor"],
    abilities: [
      { id: "kittie-pounce", name: "Kittie Pounce", role: "attack", element: "spark" },
      { id: "brain-pulse", name: "Brain Pulse", role: "utility", element: "signal" },
      { id: "soft-guard", name: "Soft Guard", role: "defense", element: "water" },
    ],
  },
  {
    match: /\b(pudgy|penguin|pengu)\b/i,
    species: "bantah-pengu",
    speciesLabel: "BantahPengu",
    rig: "bantah-mascot",
    defaultSkin: "ice-coat",
    accessories: ["ice scarf", "snow visor", "flipper gauntlets"],
    abilities: [
      { id: "ice-slide", name: "Ice Slide", role: "attack", element: "water" },
      { id: "pengu-bubble", name: "Pengu Bubble", role: "defense", element: "water" },
      { id: "cold-snap", name: "Cold Snap", role: "utility", element: "smoke" },
    ],
  },
  {
    match: /\bazuki\b/i,
    species: "bantah-zuki",
    speciesLabel: "BantahZuki",
    rig: "bantah-mascot",
    defaultSkin: "ember-kimono",
    accessories: ["blade charm", "ember sash", "duelist crest"],
    abilities: [
      { id: "zuki-slash", name: "Zuki Slash", role: "attack", element: "flame" },
      { id: "focus-step", name: "Focus Step", role: "utility", element: "signal" },
      { id: "parry-aura", name: "Parry Aura", role: "defense", element: "spark" },
    ],
  },
  {
    match: /\bdoodle(s)?\b/i,
    species: "bantah-doodle",
    speciesLabel: "BantahDoodle",
    rig: "bantah-mascot",
    defaultSkin: "marker-pop",
    accessories: ["paint halo", "sticker gloves", "color aura"],
    abilities: [
      { id: "paint-burst", name: "Paint Burst", role: "attack", element: "water" },
      { id: "sticker-wall", name: "Sticker Wall", role: "defense", element: "signal" },
      { id: "color-rush", name: "Color Rush", role: "utility", element: "spark" },
    ],
  },
  {
    match: /\bmoon\s*bird(s)?\b|\bmoonbirds\b/i,
    species: "bantah-bird",
    speciesLabel: "BantahBird",
    rig: "bantah-winged",
    defaultSkin: "lunar-feather",
    accessories: ["moon visor", "wing plates", "night badge"],
    abilities: [
      { id: "lunar-dive", name: "Lunar Dive", role: "attack", element: "shadow" },
      { id: "wing-guard", name: "Wing Guard", role: "defense", element: "smoke" },
      { id: "night-read", name: "Night Read", role: "utility", element: "signal" },
    ],
  },
  {
    match: /\b(bayc|bored\s*ape|ape)\b/i,
    species: "bantah-ape",
    speciesLabel: "BantahApe",
    rig: "bantah-mascot",
    defaultSkin: "crown-fur",
    accessories: ["crown headset", "club gloves", "gold chain"],
    abilities: [
      { id: "ape-smash", name: "Ape Smash", role: "attack", element: "flame" },
      { id: "club-stance", name: "Club Stance", role: "defense", element: "smoke" },
      { id: "king-call", name: "King Call", role: "utility", element: "signal" },
    ],
  },
  {
    match: /\bhypurr\b|\bhype?r\b/i,
    species: "bantah-hypurr",
    speciesLabel: "BantahHypurr",
    rig: "bantah-quadruped",
    defaultSkin: "hyper-stripes",
    accessories: ["neon tail", "velocity ears", "market badge"],
    abilities: [
      { id: "hypurr-lunge", name: "Hypurr Lunge", role: "attack", element: "spark" },
      { id: "liquidity-purr", name: "Liquidity Purr", role: "defense", element: "water" },
      { id: "hyper-read", name: "Hyper Read", role: "utility", element: "signal" },
    ],
  },
];

const FALLBACK_SPECIES = {
  species: "bantah-relic",
  speciesLabel: "BantahRelic",
  rig: "bantah-mascot" as const,
  defaultSkin: "relic-shell",
  accessories: ["origin badge", "trait visor", "archive aura"],
  abilities: [
    { id: "relic-burst", name: "Relic Burst", role: "attack", element: "spark" },
    { id: "archive-guard", name: "Archive Guard", role: "defense", element: "smoke" },
    { id: "trait-scan", name: "Trait Scan", role: "utility", element: "signal" },
  ] satisfies BotaDerivativeFighter["abilities"],
};

const COLORWAYS = [
  "original-orange",
  "emerald-green",
  "cobalt-blue",
  "ruby-red",
  "amethyst-purple",
  "golden-yellow",
  "full-silver",
  "bronze",
  "sky-blue",
  "fuchsia",
];

function stableIndex(seed: string, length: number) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash % Math.max(1, length);
}

function cleanText(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalizeTraits(traits: BotaDerivativeFighterInput["traits"]) {
  if (!traits) return [] as string[];
  if (Array.isArray(traits)) {
    return traits
      .map((trait) => {
        if (typeof trait === "string") return trait;
        const key = trait.trait_type || trait.traitType || trait.name || "trait";
        const value = trait.value ?? "";
        return `${key}: ${value}`;
      })
      .map((trait) => trait.trim())
      .filter(Boolean);
  }

  return Object.entries(traits)
    .map(([key, value]) => `${key}: ${String(value ?? "")}`)
    .map((trait) => trait.trim())
    .filter(Boolean);
}

function rarityTier(value: unknown, seed: string): BotaDerivativeFighter["rarityTier"] {
  const text = String(value ?? "").toLowerCase();
  if (/\blegend|mythic|1\/1|ultra\b/.test(text)) return "legendary";
  if (/\bepic|super|rarest\b/.test(text)) return "epic";
  if (/\brare|uncommon\b/.test(text)) return "rare";
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    if (numeric <= 1) return "legendary";
    if (numeric <= 5) return "epic";
    if (numeric <= 20) return "rare";
  }
  const roll = stableIndex(seed, 100);
  if (roll < 4) return "legendary";
  if (roll < 14) return "epic";
  if (roll < 38) return "rare";
  return "common";
}

function bonusForTier(tier: BotaDerivativeFighter["rarityTier"]) {
  if (tier === "legendary") return 14;
  if (tier === "epic") return 9;
  if (tier === "rare") return 5;
  return 0;
}

export function deriveBotaDerivativeFighter(input: BotaDerivativeFighterInput): BotaDerivativeFighter {
  const collectionLabel = cleanText(input.collection, "Unknown NFT Collection");
  const tokenId = input.tokenId === null || input.tokenId === undefined ? null : cleanText(input.tokenId);
  const seed = cleanText(input.seed, `${collectionLabel}:${tokenId || "nft"}`);
  const normalizedCollection = collectionLabel.toLowerCase();
  const definition =
    COLLECTION_SPECIES.find((item) => item.match.test(normalizedCollection)) || FALLBACK_SPECIES;
  const traits = normalizeTraits(input.traits);
  const tier = rarityTier(input.rarity, seed);
  const bonus = bonusForTier(tier);
  const statSeed = `${seed}:${definition.species}:${traits.join("|")}`;

  const colorTrait = traits.find((trait) => /\b(color|fur|skin|coat|palette|body)\b/i.test(trait));
  const colorway = colorTrait
    ? colorTrait
        .split(":")
        .slice(1)
        .join(":")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || COLORWAYS[stableIndex(statSeed, COLORWAYS.length)]
    : COLORWAYS[stableIndex(statSeed, COLORWAYS.length)];

  const accessoryTraits = traits
    .filter((trait) => /\b(hat|wear|accessory|eyes|mouth|tail|wing|badge|crown|mask)\b/i.test(trait))
    .slice(0, 3)
    .map((trait) => trait.split(":").pop()?.trim())
    .filter((trait): trait is string => Boolean(trait));
  const accessories = Array.from(new Set([...definition.accessories, ...accessoryTraits])).slice(0, 5);

  return {
    version: "bdf-v1",
    isDerivative: true,
    species: definition.species,
    speciesLabel: definition.speciesLabel,
    collection: normalizedCollection.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown-nft",
    collectionLabel,
    sourceTokenId: tokenId,
    fighterSkin: `${colorway}-${definition.defaultSkin}`,
    colorway,
    rarityTier: tier,
    fighterRig: definition.rig,
    visualRule: "70-bantah-30-collection",
    stats: {
      hp: 92 + bonus + stableIndex(`${statSeed}:hp`, 19),
      energy: 44 + Math.round(bonus / 2) + stableIndex(`${statSeed}:energy`, 18),
      speed: 35 + stableIndex(`${statSeed}:speed`, 28),
      power: 42 + bonus + stableIndex(`${statSeed}:power`, 24),
      defense: 38 + bonus + stableIndex(`${statSeed}:defense`, 24),
      focus: 40 + stableIndex(`${statSeed}:focus`, 25),
    },
    accessories,
    abilities: definition.abilities,
    titles: [
      definition.speciesLabel,
      tier === "legendary" ? "Legendary Derivative" : tier === "epic" ? "Epic Derivative" : "Derivative Fighter",
    ],
    tags: [
      "nft-derivative",
      definition.species,
      definition.rig,
      tier,
      colorway,
      "70-bantah-30-collection",
    ],
  };
}

export function getBotaDerivativeFighter(metadata: Record<string, unknown> | undefined | null) {
  const derivative = metadata?.derivativeFighter;
  if (!derivative || typeof derivative !== "object" || Array.isArray(derivative)) return null;
  const record = derivative as Partial<BotaDerivativeFighter>;
  if (record.version !== "bdf-v1" || record.isDerivative !== true || !record.speciesLabel) return null;
  return record as BotaDerivativeFighter;
}
