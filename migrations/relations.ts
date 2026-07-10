import { relations } from "drizzle-orm/relations";
import { chats, chatParticipants, users, challengeEvidenceReviews, eventChatMessages, eventChatMessageReactions, pointTransactions, messages, wallets, withdrawals, walletTransactions, userPresence, payoutJobs, payoutEntries, challengeDisputes, privateChats, chatMessages, creatorEarnings, eventEscrow, supportMessages } from "./schema";

export const chatParticipantsRelations = relations(chatParticipants, ({one}) => ({
	chat: one(chats, {
		fields: [chatParticipants.chatId],
		references: [chats.id]
	}),
	users: one(users, {
		fields: [chatParticipants.userId],
		references: [users.id]
	}),
}));

export const chatsRelations = relations(chats, ({many}) => ({
	chatParticipants: many(chatParticipants),
	messages: many(messages),
}));

export const usersRelations = relations(users, ({many}) => ({
	chatParticipants: many(chatParticipants),
	challengeEvidenceReviews: many(challengeEvidenceReviews),
	eventChatMessages: many(eventChatMessages),
	eventChatMessageReactions: many(eventChatMessageReactions),
	pointTransactions: many(pointTransactions),
	messages: many(messages),
	userPresences: many(userPresence),
	challengeDisputes_initiatedBy: many(challengeDisputes, {
		relationName: "challengeDisputes_initiatedBy_users_id"
	}),
	challengeDisputes_resolvedBy: many(challengeDisputes, {
		relationName: "challengeDisputes_resolvedBy_users_id"
	}),
	chatMessages: many(chatMessages),
	creatorEarnings: many(creatorEarnings),
	eventEscrows: many(eventEscrow),
	supportMessages: many(supportMessages),
	wallets: many(wallets),
}));

export const challengeEvidenceReviewsRelations = relations(challengeEvidenceReviews, ({one}) => ({
	users: one(users, {
		fields: [challengeEvidenceReviews.userId],
		references: [users.id]
	}),
}));

export const eventChatMessagesRelations = relations(eventChatMessages, ({one, many}) => ({
	eventChatMessage: one(eventChatMessages, {
		fields: [eventChatMessages.replyTo],
		references: [eventChatMessages.id],
		relationName: "eventChatMessages_replyTo_eventChatMessages_id"
	}),
	eventChatMessages: many(eventChatMessages, {
		relationName: "eventChatMessages_replyTo_eventChatMessages_id"
	}),
	users: one(users, {
		fields: [eventChatMessages.senderId],
		references: [users.id]
	}),
	eventChatMessageReactions: many(eventChatMessageReactions),
}));

export const eventChatMessageReactionsRelations = relations(eventChatMessageReactions, ({one}) => ({
	eventChatMessage: one(eventChatMessages, {
		fields: [eventChatMessageReactions.messageId],
		references: [eventChatMessages.id]
	}),
	users: one(users, {
		fields: [eventChatMessageReactions.userId],
		references: [users.id]
	}),
}));

export const pointTransactionsRelations = relations(pointTransactions, ({one}) => ({
	users: one(users, {
		fields: [pointTransactions.userId],
		references: [users.id]
	}),
}));

export const messagesRelations = relations(messages, ({one}) => ({
	chat: one(chats, {
		fields: [messages.chatId],
		references: [chats.id]
	}),
	users: one(users, {
		fields: [messages.senderId],
		references: [users.id]
	}),
}));

export const withdrawalsRelations = relations(withdrawals, ({one}) => ({
	wallet: one(wallets, {
		fields: [withdrawals.walletId],
		references: [wallets.id]
	}),
}));

export const walletsRelations = relations(wallets, ({one, many}) => ({
	withdrawals: many(withdrawals),
	walletTransactions: many(walletTransactions),
	users: one(users, {
		fields: [wallets.userId],
		references: [users.id]
	}),
}));

export const walletTransactionsRelations = relations(walletTransactions, ({one}) => ({
	wallet: one(wallets, {
		fields: [walletTransactions.walletId],
		references: [wallets.id]
	}),
}));

export const userPresenceRelations = relations(userPresence, ({one}) => ({
	users: one(users, {
		fields: [userPresence.userId],
		references: [users.id]
	}),
}));

export const payoutEntriesRelations = relations(payoutEntries, ({one}) => ({
	payoutJob: one(payoutJobs, {
		fields: [payoutEntries.jobId],
		references: [payoutJobs.id]
	}),
}));

export const payoutJobsRelations = relations(payoutJobs, ({many}) => ({
	payoutEntries: many(payoutEntries),
}));

export const challengeDisputesRelations = relations(challengeDisputes, ({one}) => ({
	users_initiatedBy: one(users, {
		fields: [challengeDisputes.initiatedBy],
		references: [users.id],
		relationName: "challengeDisputes_initiatedBy_users_id"
	}),
	users_resolvedBy: one(users, {
		fields: [challengeDisputes.resolvedBy],
		references: [users.id],
		relationName: "challengeDisputes_resolvedBy_users_id"
	}),
}));

export const chatMessagesRelations = relations(chatMessages, ({one}) => ({
	privateChat: one(privateChats, {
		fields: [chatMessages.chatId],
		references: [privateChats.id]
	}),
	users: one(users, {
		fields: [chatMessages.senderId],
		references: [users.id]
	}),
}));

export const privateChatsRelations = relations(privateChats, ({many}) => ({
	chatMessages: many(chatMessages),
}));

export const creatorEarningsRelations = relations(creatorEarnings, ({one}) => ({
	users: one(users, {
		fields: [creatorEarnings.creatorId],
		references: [users.id]
	}),
}));

export const eventEscrowRelations = relations(eventEscrow, ({one}) => ({
	users: one(users, {
		fields: [eventEscrow.userId],
		references: [users.id]
	}),
}));

export const supportMessagesRelations = relations(supportMessages, ({one}) => ({
	users: one(users, {
		fields: [supportMessages.userId],
		references: [users.id]
	}),
}));
