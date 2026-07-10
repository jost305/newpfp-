import type { OnchainTokenSymbol } from "./onchainConfig";

export type BotaAgentChallengePredictionSide = "YES" | "NO";

export type BotaAgentChallengePredictionEscrowStatus =
  | "escrow_required"
  | "escrow_locked"
  | "settled"
  | "cancelled"
  | "failed";

export type BotaAgentChallengePredictionPosition = {
  id: string;
  userId: string;
  challengeCode: string;
  side: BotaAgentChallengePredictionSide;
  sideAgentId: string;
  sideAgentName: string;
  stakeAmount: number;
  stakeCurrency: OnchainTokenSymbol;
  escrowChallengeId: number | null;
  escrowChainId: number | null;
  escrowTokenSymbol: OnchainTokenSymbol | null;
  walletAddress: string | null;
  escrowStatus: BotaAgentChallengePredictionEscrowStatus;
  escrowTxHash: string | null;
  winnerSide: BotaAgentChallengePredictionSide | null;
  payoutAmount: number | null;
  payoutTxHash: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BotaAgentChallengePredictionSidePool = {
  side: BotaAgentChallengePredictionSide;
  label: string;
  agentId: string;
  agentName: string;
  avatarUrl: string | null;
  totalStake: number;
  bettorCount: number;
  sharePercent: number;
};

export type BotaAgentChallengePredictionPool = {
  challengeCode: string;
  status: "betting_open" | "closed";
  closeReason: string | null;
  stakeCurrency: OnchainTokenSymbol;
  escrowMode: "intent_tracking" | "contract_escrow" | "escrow_locked";
  escrowChallengeId: number | null;
  escrowChainId: number | null;
  escrowTokenSymbol: OnchainTokenSymbol | null;
  totalStake: number;
  positionCount: number;
  sides: [BotaAgentChallengePredictionSidePool, BotaAgentChallengePredictionSidePool];
  userPosition: BotaAgentChallengePredictionPosition | null;
  updatedAt: string;
  message: string;
};

export type BotaAgentChallengePredictionStakeResponse = {
  position: BotaAgentChallengePredictionPosition;
  pool: BotaAgentChallengePredictionPool;
  message: string;
};
