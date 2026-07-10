export type AgentBattleP2PEscrowStatus =
  | "intent_saved"
  | "escrow_required"
  | "escrow_locked"
  | "settled"
  | "cancelled"
  | "failed";

export type AgentBattleP2PRoundSettlementStatus =
  | "open"
  | "settling"
  | "settled"
  | "partially_settled"
  | "settlement_failed";

export type AgentBattleP2PResultStatus =
  | "live"
  | "needs_escrow"
  | "awaiting_settlement"
  | "won"
  | "lost"
  | "unmatched"
  | "cancelled"
  | "failed";

export type AgentBattleP2PPosition = {
  id: string;
  userId: string;
  battleId: string;
  roundId: string;
  roundStartsAt: string;
  roundEndsAt: string;
  sideId: string;
  sideLabel: string;
  sideSymbol: string | null;
  sideLogoUrl: string | null;
  opponentSideId: string | null;
  stakeAmount: number;
  stakeCurrency: "BXBT" | "USDC" | "USDT" | "ETH" | "BNB";
  escrowChallengeId: number | null;
  escrowChainId: number | null;
  escrowTokenSymbol: "USDC" | "USDT" | "ETH" | "BNB" | null;
  walletAddress: string | null;
  escrowStatus: AgentBattleP2PEscrowStatus;
  escrowTxHash: string | null;
  winnerSideId: string | null;
  payoutAmount: number | null;
  payoutTxHash: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AgentBattleP2PSidePool = {
  sideId: string;
  label: string;
  tokenSymbol: string | null;
  logoUrl: string | null;
  confidence: number;
  totalStake: number;
  bettorCount: number;
  sharePercent: number;
};

export type AgentBattleP2PPool = {
  battleId: string;
  roundId: string;
  roundStartsAt: string;
  roundEndsAt: string;
  status: "betting_open" | "closed";
  stakeCurrency: "BXBT" | "USDC" | "USDT" | "ETH" | "BNB";
  escrowMode: "intent_tracking" | "contract_escrow" | "escrow_locked";
  escrowChallengeId: number | null;
  escrowChainId: number | null;
  escrowTokenSymbol: "USDC" | "USDT" | "ETH" | "BNB" | null;
  totalStake: number;
  positionCount: number;
  sides: [AgentBattleP2PSidePool, AgentBattleP2PSidePool];
  userPosition: AgentBattleP2PPosition | null;
  updatedAt: string;
  message: string;
};

export type AgentBattleP2PStakeResponse = {
  position: AgentBattleP2PPosition;
  pool: AgentBattleP2PPool;
  message: string;
};

export type AgentBattleP2PHistoryPosition = AgentBattleP2PPosition & {
  battleTitle: string;
  opponentSideLabel: string | null;
  opponentSideSymbol: string | null;
  opponentSideLogoUrl: string | null;
  settlementStatus: AgentBattleP2PRoundSettlementStatus | null;
  settlementError: string | null;
  settledAt: string | null;
  resultStatus: AgentBattleP2PResultStatus;
  didWin: boolean | null;
  earnedAmount: number | null;
  winningPayoutAmount: number | null;
};

export type AgentBattleP2PHistoryResponse = {
  positions: AgentBattleP2PHistoryPosition[];
  updatedAt: string;
};
