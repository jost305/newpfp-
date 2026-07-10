import type { ExternalMarketSource, ExternalMarketStatus } from "./externalMarkets";

export type PredictionVisualizationMode = "visualization";

export type PredictionVisualizationExecutionStatus =
  | "read-only"
  | "external-action-ready"
  | "clob-planned";

export type PredictionVisualizationPositionStatus =
  | "intent_saved"
  | "execution_checked"
  | "source_opened"
  | "submitted"
  | "filled"
  | "cancelled"
  | "failed";

export type PredictionVisualizationExecutionCheck = {
  id: string;
  label: string;
  ready: boolean;
  detail: string;
};

export type PredictionVisualizationSide = {
  id: string;
  outcome: "YES" | "NO";
  label: string;
  factionName: string;
  emoji: string;
  color: "green" | "red";
  sourceTokenId: string | null;
  price: number;
  priceDisplay: string;
  impliedProbability: number;
  confidence: number;
  sourceActionLabel: string;
};

export type PredictionVisualizationOrderIntent = {
  battleId: string;
  sourcePlatform: ExternalMarketSource;
  sourceMarketId: string;
  sourceMarketUrl: string;
  side: "yes" | "no";
  outcome: "YES" | "NO";
  factionName: string;
  sourceTokenId: string | null;
  amountUsd: number;
  maxPrice: number;
  estimatedShares: number;
  executionStatus: PredictionVisualizationExecutionStatus;
  executionReady: boolean;
  nextAction: "open-source-market" | "clob-not-configured";
  message: string;
  warnings: string[];
};

export type PredictionVisualizationExecutionPreflight = {
  positionId: string;
  battleId: string;
  sourcePlatform: ExternalMarketSource;
  sourceMarketId: string;
  side: "yes" | "no";
  outcome: "YES" | "NO";
  walletAddress: string | null;
  amountUsd: number;
  maxPrice: number;
  sourceTokenId: string | null;
  estimatedShares: number;
  orderType: "marketable-limit";
  executionReady: boolean;
  nextAction:
    | "connect-wallet"
    | "open-source-market"
    | "configure-clob"
    | "wire-wallet-signer"
    | "submit-clob-order";
  checks: PredictionVisualizationExecutionCheck[];
  message: string;
  warnings: string[];
  clob: {
    host: string | null;
    chainId: number | null;
    executionEnabled: boolean;
    sdkAvailable: boolean;
    serverCredentialsConfigured: boolean;
  };
};

export type PredictionVisualizationUserPosition = {
  id: string;
  userId: string;
  battleId: string;
  sourcePlatform: ExternalMarketSource;
  sourceMarketId: string;
  sourceMarketUrl: string;
  marketTitle: string;
  side: "yes" | "no";
  outcome: "YES" | "NO";
  factionName: string;
  sourceTokenId: string | null;
  walletAddress: string | null;
  amountUsd: number;
  maxPrice: number;
  estimatedShares: number;
  status: PredictionVisualizationPositionStatus;
  executionStatus: PredictionVisualizationExecutionStatus;
  externalOrderId: string | null;
  externalStatus: string | null;
  lastError: string | null;
  sourceOpenedAt: string | null;
  fillSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PredictionVisualizationPositionResponse = {
  position: PredictionVisualizationUserPosition;
  intent: PredictionVisualizationOrderIntent;
  battle: PredictionVisualizationBattle;
};

export type PredictionVisualizationEvent = {
  id: string;
  time: string;
  type: "odds" | "volume" | "liquidity" | "system";
  sideId: string | null;
  agentName: string;
  message: string;
  metricLabel: string | null;
  metricValue: string | null;
};

export type PredictionVisualizationBattle = {
  id: string;
  title: string;
  battleType: "prediction-visualization";
  mode: PredictionVisualizationMode;
  sourcePlatform: ExternalMarketSource;
  sourceMarketId: string;
  sourceMarketUrl: string;
  sourceStatus: ExternalMarketStatus;
  sourceSlug: string | null;
  marketTitle: string;
  category: string | null;
  volume: number;
  liquidity: number;
  endDate: string | null;
  timeRemainingSeconds: number | null;
  winnerLogic: string;
  sides: [PredictionVisualizationSide, PredictionVisualizationSide];
  leadingSideId: string;
  confidenceSpread: number;
  events: PredictionVisualizationEvent[];
  execution: {
    status: PredictionVisualizationExecutionStatus;
    tradeRouting: "external" | "polymarket-clob-planned";
    primaryActionLabel: string;
    note: string;
  };
  updatedAt: string;
};

export type PredictionVisualizationFeed = {
  battles: PredictionVisualizationBattle[];
  updatedAt: string;
  sources: {
    marketData: ExternalMarketSource;
    mode: PredictionVisualizationMode;
    note: string;
  };
};
