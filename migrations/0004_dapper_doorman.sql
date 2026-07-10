CREATE TABLE IF NOT EXISTS "agent_battle_p2p_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"battle_id" varchar(255) NOT NULL,
	"round_id" varchar(320) NOT NULL,
	"round_starts_at" timestamp NOT NULL,
	"round_ends_at" timestamp NOT NULL,
	"side_id" text NOT NULL,
	"side_label" varchar(160) NOT NULL,
	"side_symbol" varchar(64),
	"side_logo_url" text,
	"opponent_side_id" text,
	"stake_amount" numeric(18, 6) NOT NULL,
	"stake_currency" varchar(16) DEFAULT 'BXBT' NOT NULL,
	"escrow_challenge_id" integer,
	"escrow_chain_id" integer,
	"escrow_token_symbol" varchar(16),
	"wallet_address" varchar(128),
	"escrow_status" varchar(32) DEFAULT 'intent_saved' NOT NULL,
	"escrow_tx_hash" varchar(80),
	"winner_side_id" text,
	"payout_amount" numeric(18, 6),
	"payout_tx_hash" varchar(80),
	"snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_battle_p2p_positions_user_round_unique" UNIQUE("user_id","round_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_battle_p2p_rounds" (
	"id" serial PRIMARY KEY NOT NULL,
	"battle_id" varchar(255) NOT NULL,
	"round_id" varchar(320) NOT NULL,
	"round_starts_at" timestamp NOT NULL,
	"round_ends_at" timestamp NOT NULL,
	"escrow_challenge_id" integer,
	"escrow_chain_id" integer NOT NULL,
	"escrow_token_symbol" varchar(16) NOT NULL,
	"settlement_status" varchar(32) DEFAULT 'open' NOT NULL,
	"winner_side_id" text,
	"settlement_tx_hashes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"settlement_error" text,
	"settled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_battle_p2p_rounds_round_id_unique" UNIQUE("round_id"),
	CONSTRAINT "agent_battle_p2p_rounds_escrow_challenge_id_unique" UNIQUE("escrow_challenge_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_follows" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"agent_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "agent_follows_user_agent_unique" UNIQUE("user_id","agent_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"market_id" varchar(128) NOT NULL,
	"external_market_id" varchar(128) NOT NULL,
	"market_question" text,
	"side" varchar(8) NOT NULL,
	"action" varchar(16) DEFAULT 'buy' NOT NULL,
	"intended_stake_usd" numeric(12, 2) NOT NULL,
	"intended_price" numeric(8, 4) NOT NULL,
	"external_order_id" varchar(255),
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"failure_reason" text,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"market_id" varchar(128) NOT NULL,
	"external_market_id" varchar(128) NOT NULL,
	"market_question" text,
	"side" varchar(8) NOT NULL,
	"total_shares" numeric(18, 6) DEFAULT '0' NOT NULL,
	"avg_entry_price" numeric(8, 4) DEFAULT '0' NOT NULL,
	"current_mark_price" numeric(8, 4),
	"realized_pnl" numeric(14, 4) DEFAULT '0' NOT NULL,
	"unrealized_pnl" numeric(14, 4) DEFAULT '0' NOT NULL,
	"status" varchar(16) DEFAULT 'open' NOT NULL,
	"opened_at" timestamp DEFAULT now(),
	"closed_at" timestamp,
	"last_synced_at" timestamp,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agents" (
	"agent_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" varchar NOT NULL,
	"agent_name" varchar NOT NULL,
	"avatar_url" varchar,
	"agent_type" varchar(32) NOT NULL,
	"wallet_address" varchar NOT NULL,
	"endpoint_url" varchar(512) NOT NULL,
	"bantah_skill_version" varchar(24) DEFAULT '1.0.0' NOT NULL,
	"specialty" varchar(32) DEFAULT 'general' NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"can_trade" boolean DEFAULT true NOT NULL,
	"strategy_type" varchar(48) DEFAULT 'probability_threshold' NOT NULL,
	"strategy_config" jsonb,
	"risk_profile" jsonb,
	"visibility" varchar(24) DEFAULT 'public' NOT NULL,
	"max_position_size" numeric(12, 2) DEFAULT '25.00' NOT NULL,
	"daily_trade_limit" integer DEFAULT 5 NOT NULL,
	"max_open_positions" integer DEFAULT 3 NOT NULL,
	"skill_actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"wallet_network_id" varchar(64),
	"wallet_provider" varchar(64),
	"owner_wallet_address" varchar,
	"wallet_data" jsonb,
	"runtime_engine" varchar(32),
	"runtime_status" varchar(32),
	"runtime_config" jsonb,
	"points" integer DEFAULT 0 NOT NULL,
	"win_count" integer DEFAULT 0 NOT NULL,
	"loss_count" integer DEFAULT 0 NOT NULL,
	"market_count" integer DEFAULT 0 NOT NULL,
	"is_tokenized" boolean DEFAULT false NOT NULL,
	"last_skill_check_at" timestamp,
	"last_skill_check_score" integer,
	"last_skill_check_status" varchar(16),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "agents_wallet_address_unique" UNIQUE("wallet_address"),
	CONSTRAINT "agents_endpoint_url_unique" UNIQUE("endpoint_url")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bantahbro_listed_battles" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"engine_battle_id" varchar(255) NOT NULL,
	"status" varchar(24) DEFAULT 'listed' NOT NULL,
	"source" varchar(24) DEFAULT 'engine' NOT NULL,
	"listed_by" varchar(255),
	"battle" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"listed_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bantahbro_listed_battles_engine_battle_id_unique" UNIQUE("engine_battle_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bantcredit_balances" (
	"wallet_address" text PRIMARY KEY NOT NULL,
	"balance" numeric(20, 8) DEFAULT '0' NOT NULL,
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bantcredit_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" text NOT NULL,
	"amount" numeric(20, 8) NOT NULL,
	"transaction_type" text NOT NULL,
	"reference_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bantcredit_pot" (
	"id" serial PRIMARY KEY NOT NULL,
	"usdt_reserve" numeric(20, 8) DEFAULT '0' NOT NULL,
	"bc_circulation" numeric(20, 8) DEFAULT '0' NOT NULL,
	"current_rate" numeric(20, 8) DEFAULT '1' NOT NULL,
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bota_arena_battle_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"record_key" varchar(360) NOT NULL,
	"battle_id" varchar(255) NOT NULL,
	"source_battle_id" varchar(255),
	"title" varchar(255) NOT NULL,
	"arena_id" varchar(120),
	"status" varchar(24) DEFAULT 'resolved' NOT NULL,
	"winner_agent_id" varchar(180),
	"winner_side_id" varchar(180),
	"loser_agent_id" varchar(180),
	"loser_side_id" varchar(180),
	"provider" varchar(40) NOT NULL,
	"adapter_version" varchar(40) NOT NULL,
	"engine_version" varchar(40) NOT NULL,
	"seed" varchar(255) NOT NULL,
	"rounds" integer DEFAULT 0 NOT NULL,
	"spectators" integer DEFAULT 0 NOT NULL,
	"fighters" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"round_log" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"simulation" jsonb NOT NULL,
	"battle_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"resolved_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bota_arena_battle_records_record_key_unique" UNIQUE("record_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bota_battle_round_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"battle_id" uuid NOT NULL,
	"round_number" integer NOT NULL,
	"fighter_id" text NOT NULL,
	"action_taken" text NOT NULL,
	"tool_used_id" text,
	"damage_dealt" integer,
	"hp_after" integer,
	"win_probability_before" numeric(5, 2),
	"rng_seed" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bota_fighter_combat_profiles" (
	"fighter_id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"aggression" integer NOT NULL,
	"defense" integer NOT NULL,
	"intelligence" integer NOT NULL,
	"speed" integer NOT NULL,
	"luck" integer NOT NULL,
	"hp" integer NOT NULL,
	"generation_bonus" integer DEFAULT 0,
	"profile_generated_at" timestamp DEFAULT now(),
	"profile_version" integer DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bota_fighter_loadout" (
	"fighter_id" text PRIMARY KEY NOT NULL,
	"owner_wallet" text NOT NULL,
	"primary_tool_id" uuid,
	"secondary_tool_id" uuid,
	"passive_tool_id" uuid,
	"effective_tier" text DEFAULT 'none' NOT NULL,
	"soul_drain_active" boolean DEFAULT false,
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bota_fighter_profiles" (
	"agent_id" varchar(180) PRIMARY KEY NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"origin" varchar(32) DEFAULT 'bota' NOT NULL,
	"origin_id" varchar(180),
	"agent_class" varchar(40) DEFAULT 'striker' NOT NULL,
	"archetype" varchar(40) DEFAULT 'signal_striker' NOT NULL,
	"league" varchar(80) DEFAULT 'Open League' NOT NULL,
	"rank" integer,
	"avatar_url" text,
	"badge_label" varchar(80),
	"ens_name" varchar(160),
	"wallet_address" varchar(128),
	"external_url" text,
	"token_symbol" varchar(64),
	"token_name" varchar(160),
	"chain_id" varchar(64),
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"fame_score" numeric(12, 2) DEFAULT '0' NOT NULL,
	"watchers" integer DEFAULT 0 NOT NULL,
	"challenge_volume" integer DEFAULT 0 NOT NULL,
	"titles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_battle_id" varchar(255),
	"combat_profile_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"imported_at" timestamp DEFAULT now(),
	"last_seen_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bota_tool_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tool_catalog_id" text NOT NULL,
	"owner_wallet" text NOT NULL,
	"acquired_from" text,
	"acquired_at" timestamp DEFAULT now(),
	"equipped_to_fighter_id" text,
	"equipped_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bota_tools_catalog" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tier" text NOT NULL,
	"role" text NOT NULL,
	"compatible_trait" text NOT NULL,
	"trigger_condition_desc" text,
	"trigger_condition_json" jsonb,
	"effect_desc" text NOT NULL,
	"effect_json" jsonb NOT NULL,
	"cooldown_rounds" integer DEFAULT 0,
	"soul_drain_enabled" boolean DEFAULT false,
	"once_per_battle" boolean DEFAULT false,
	"power_rating" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "decision_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"market_id" varchar(128) NOT NULL,
	"external_market_id" varchar(128) NOT NULL,
	"market_question" text,
	"strategy_type" varchar(48) NOT NULL,
	"action" varchar(16) NOT NULL,
	"confidence" numeric(5, 4) DEFAULT '0' NOT NULL,
	"intended_price" numeric(8, 4),
	"intended_stake_usd" numeric(12, 2),
	"reason" text NOT NULL,
	"risk_allowed" boolean DEFAULT false NOT NULL,
	"risk_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"linked_order_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gen1_inventories" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_user_id" varchar,
	"tool_id" uuid,
	"quantity" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gen1_listings" (
	"listing_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_user_id" varchar,
	"fighter_agent_id" varchar(180),
	"tool_id" uuid,
	"price" numeric(30, 8) NOT NULL,
	"currency" varchar(16) DEFAULT 'BC' NOT NULL,
	"status" varchar(24) DEFAULT 'open' NOT NULL,
	"reserved_by" varchar(255),
	"reserved_until" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gen1_tool_installs" (
	"id" serial PRIMARY KEY NOT NULL,
	"fighter_agent_id" varchar(180),
	"owner_user_id" varchar,
	"tool_id" uuid,
	"season" integer DEFAULT 1 NOT NULL,
	"installed_at" timestamp DEFAULT now(),
	"removed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gen1_tools" (
	"tool_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tool_key" varchar(128) NOT NULL,
	"name" varchar(255) NOT NULL,
	"rarity" varchar(32) NOT NULL,
	"season" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"total_supply" integer DEFAULT 0,
	"mintable" boolean DEFAULT true NOT NULL,
	"price" numeric(30, 8),
	"currency" varchar(16),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "gen1_tools_tool_key_unique" UNIQUE("tool_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "marketplace_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_wallet" text NOT NULL,
	"fighter_id" text NOT NULL,
	"price_usdt" numeric(20, 8) NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"listed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "matchmaking_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fighter_id" text NOT NULL,
	"wallet_address" text NOT NULL,
	"tier" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"entered_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prediction_visualization_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"battle_id" varchar(255) NOT NULL,
	"source_platform" varchar(64) NOT NULL,
	"source_market_id" varchar(255) NOT NULL,
	"source_market_url" text NOT NULL,
	"market_title" text NOT NULL,
	"side" varchar(8) NOT NULL,
	"outcome" varchar(8) NOT NULL,
	"faction_name" varchar(160) NOT NULL,
	"source_token_id" text,
	"wallet_address" varchar(96),
	"amount_usd" numeric(12, 2) NOT NULL,
	"max_price" numeric(8, 4) NOT NULL,
	"estimated_shares" numeric(18, 6) NOT NULL,
	"status" varchar(24) DEFAULT 'intent_saved' NOT NULL,
	"execution_status" varchar(32) DEFAULT 'clob-planned' NOT NULL,
	"external_order_id" varchar(255),
	"external_status" varchar(64),
	"last_error" text,
	"source_opened_at" timestamp,
	"fill_synced_at" timestamp,
	"snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "prediction_visualization_positions_user_battle_unique" UNIQUE("user_id","battle_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "soul_drain_cooldowns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"winner_wallet" text NOT NULL,
	"loser_wallet" text NOT NULL,
	"drained_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "token_launches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"agent_id" uuid,
	"chain_id" integer NOT NULL,
	"network_id" varchar(64) NOT NULL,
	"factory_address" varchar(64),
	"token_address" varchar(64),
	"owner_address" varchar(64) NOT NULL,
	"token_name" varchar(80) NOT NULL,
	"token_symbol" varchar(16) NOT NULL,
	"decimals" integer DEFAULT 18 NOT NULL,
	"initial_supply" varchar(80) NOT NULL,
	"initial_supply_atomic" varchar(96) NOT NULL,
	"deploy_tx_hash" varchar(80),
	"status" varchar(24) DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "points" SET DEFAULT 5;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "challenged_wallet_address" varchar;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "creator_type" varchar(16) DEFAULT 'human';--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "challenger_type" varchar(16) DEFAULT 'human';--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "challenged_type" varchar(16) DEFAULT 'human';--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "creator_agent_id" uuid;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "challenger_agent_id" uuid;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "challenged_agent_id" uuid;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "created_by_agent" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "agent_involved" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "challenger_side" varchar;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "challenged_side" varchar;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "settlement_rail" varchar DEFAULT 'offchain';--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "chain_id" integer;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "token_symbol" varchar;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "token_address" varchar;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "stake_atomic" varchar;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "decimals" integer;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "escrow_tx_hash" varchar;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "settle_tx_hash" varchar;--> statement-breakpoint
ALTER TABLE "pair_queue" ADD COLUMN "participant_type" varchar(16) DEFAULT 'human';--> statement-breakpoint
ALTER TABLE "pair_queue" ADD COLUMN "agent_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "primary_wallet_address" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "wallet_addresses" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "agent_battle_p2p_positions" ADD CONSTRAINT "agent_battle_p2p_positions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_follows" ADD CONSTRAINT "agent_follows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_follows" ADD CONSTRAINT "agent_follows_agent_id_agents_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("agent_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_orders" ADD CONSTRAINT "agent_orders_agent_id_agents_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("agent_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_positions" ADD CONSTRAINT "agent_positions_agent_id_agents_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("agent_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bota_fighter_loadout" ADD CONSTRAINT "bota_fighter_loadout_primary_tool_id_bota_tool_inventory_id_fk" FOREIGN KEY ("primary_tool_id") REFERENCES "public"."bota_tool_inventory"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bota_fighter_loadout" ADD CONSTRAINT "bota_fighter_loadout_secondary_tool_id_bota_tool_inventory_id_fk" FOREIGN KEY ("secondary_tool_id") REFERENCES "public"."bota_tool_inventory"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bota_fighter_loadout" ADD CONSTRAINT "bota_fighter_loadout_passive_tool_id_bota_tool_inventory_id_fk" FOREIGN KEY ("passive_tool_id") REFERENCES "public"."bota_tool_inventory"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bota_tool_inventory" ADD CONSTRAINT "bota_tool_inventory_tool_catalog_id_bota_tools_catalog_id_fk" FOREIGN KEY ("tool_catalog_id") REFERENCES "public"."bota_tools_catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_logs" ADD CONSTRAINT "decision_logs_agent_id_agents_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("agent_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_logs" ADD CONSTRAINT "decision_logs_linked_order_id_agent_orders_id_fk" FOREIGN KEY ("linked_order_id") REFERENCES "public"."agent_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gen1_inventories" ADD CONSTRAINT "gen1_inventories_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gen1_inventories" ADD CONSTRAINT "gen1_inventories_tool_id_gen1_tools_tool_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."gen1_tools"("tool_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gen1_listings" ADD CONSTRAINT "gen1_listings_seller_user_id_users_id_fk" FOREIGN KEY ("seller_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gen1_listings" ADD CONSTRAINT "gen1_listings_fighter_agent_id_bota_fighter_profiles_agent_id_fk" FOREIGN KEY ("fighter_agent_id") REFERENCES "public"."bota_fighter_profiles"("agent_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gen1_listings" ADD CONSTRAINT "gen1_listings_tool_id_gen1_tools_tool_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."gen1_tools"("tool_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gen1_tool_installs" ADD CONSTRAINT "gen1_tool_installs_fighter_agent_id_bota_fighter_profiles_agent_id_fk" FOREIGN KEY ("fighter_agent_id") REFERENCES "public"."bota_fighter_profiles"("agent_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gen1_tool_installs" ADD CONSTRAINT "gen1_tool_installs_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gen1_tool_installs" ADD CONSTRAINT "gen1_tool_installs_tool_id_gen1_tools_tool_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."gen1_tools"("tool_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prediction_visualization_positions" ADD CONSTRAINT "prediction_visualization_positions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_launches" ADD CONSTRAINT "token_launches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_launches" ADD CONSTRAINT "token_launches_agent_id_agents_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("agent_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_agent_battle_p2p_positions_user_id" ON "agent_battle_p2p_positions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_agent_battle_p2p_positions_battle_id" ON "agent_battle_p2p_positions" USING btree ("battle_id");--> statement-breakpoint
CREATE INDEX "idx_agent_battle_p2p_positions_round_id" ON "agent_battle_p2p_positions" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "idx_agent_battle_p2p_positions_escrow_status" ON "agent_battle_p2p_positions" USING btree ("escrow_status");--> statement-breakpoint
CREATE INDEX "idx_agent_battle_p2p_positions_updated_at" ON "agent_battle_p2p_positions" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_agent_battle_p2p_rounds_battle_id" ON "agent_battle_p2p_rounds" USING btree ("battle_id");--> statement-breakpoint
CREATE INDEX "idx_agent_battle_p2p_rounds_round_id" ON "agent_battle_p2p_rounds" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "idx_agent_battle_p2p_rounds_escrow_challenge_id" ON "agent_battle_p2p_rounds" USING btree ("escrow_challenge_id");--> statement-breakpoint
CREATE INDEX "idx_agent_follows_user_id" ON "agent_follows" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_agent_follows_agent_id" ON "agent_follows" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_agent_orders_agent_id" ON "agent_orders" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_agent_orders_market_id" ON "agent_orders" USING btree ("market_id");--> statement-breakpoint
CREATE INDEX "idx_agent_orders_external_market_id" ON "agent_orders" USING btree ("external_market_id");--> statement-breakpoint
CREATE INDEX "idx_agent_orders_status" ON "agent_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_agent_orders_created_at" ON "agent_orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_agent_positions_agent_id" ON "agent_positions" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_agent_positions_market_id" ON "agent_positions" USING btree ("market_id");--> statement-breakpoint
CREATE INDEX "idx_agent_positions_external_market_id" ON "agent_positions" USING btree ("external_market_id");--> statement-breakpoint
CREATE INDEX "idx_agent_positions_status" ON "agent_positions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_agent_positions_updated_at" ON "agent_positions" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_agents_owner_id" ON "agents" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_agents_agent_type" ON "agents" USING btree ("agent_type");--> statement-breakpoint
CREATE INDEX "idx_agents_endpoint_url" ON "agents" USING btree ("endpoint_url");--> statement-breakpoint
CREATE INDEX "idx_agents_status" ON "agents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_agents_specialty" ON "agents" USING btree ("specialty");--> statement-breakpoint
CREATE INDEX "idx_agents_points" ON "agents" USING btree ("points");--> statement-breakpoint
CREATE INDEX "idx_agents_can_trade" ON "agents" USING btree ("can_trade");--> statement-breakpoint
CREATE INDEX "idx_bantahbro_listed_battles_engine_id" ON "bantahbro_listed_battles" USING btree ("engine_battle_id");--> statement-breakpoint
CREATE INDEX "idx_bantahbro_listed_battles_listed_at" ON "bantahbro_listed_battles" USING btree ("listed_at");--> statement-breakpoint
CREATE INDEX "idx_bantahbro_listed_battles_source" ON "bantahbro_listed_battles" USING btree ("source");--> statement-breakpoint
CREATE INDEX "idx_bota_arena_battle_records_record_key" ON "bota_arena_battle_records" USING btree ("record_key");--> statement-breakpoint
CREATE INDEX "idx_bota_arena_battle_records_battle_id" ON "bota_arena_battle_records" USING btree ("battle_id");--> statement-breakpoint
CREATE INDEX "idx_bota_arena_battle_records_winner_agent_id" ON "bota_arena_battle_records" USING btree ("winner_agent_id");--> statement-breakpoint
CREATE INDEX "idx_bota_arena_battle_records_created_at" ON "bota_arena_battle_records" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_bota_fighter_profiles_origin" ON "bota_fighter_profiles" USING btree ("origin");--> statement-breakpoint
CREATE INDEX "idx_bota_fighter_profiles_rank" ON "bota_fighter_profiles" USING btree ("rank");--> statement-breakpoint
CREATE INDEX "idx_bota_fighter_profiles_fame_score" ON "bota_fighter_profiles" USING btree ("fame_score");--> statement-breakpoint
CREATE INDEX "idx_bota_fighter_profiles_last_seen_at" ON "bota_fighter_profiles" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "idx_decision_logs_agent_id" ON "decision_logs" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_decision_logs_market_id" ON "decision_logs" USING btree ("market_id");--> statement-breakpoint
CREATE INDEX "idx_decision_logs_external_market_id" ON "decision_logs" USING btree ("external_market_id");--> statement-breakpoint
CREATE INDEX "idx_decision_logs_created_at" ON "decision_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_gen1_inventories_owner_user_id" ON "gen1_inventories" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "idx_gen1_listings_status" ON "gen1_listings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_gen1_tool_installs_fighter_agent_id" ON "gen1_tool_installs" USING btree ("fighter_agent_id");--> statement-breakpoint
CREATE INDEX "idx_prediction_visualization_positions_user_id" ON "prediction_visualization_positions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_prediction_visualization_positions_battle_id" ON "prediction_visualization_positions" USING btree ("battle_id");--> statement-breakpoint
CREATE INDEX "idx_prediction_visualization_positions_source_market_id" ON "prediction_visualization_positions" USING btree ("source_market_id");--> statement-breakpoint
CREATE INDEX "idx_prediction_visualization_positions_status" ON "prediction_visualization_positions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_prediction_visualization_positions_updated_at" ON "prediction_visualization_positions" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_token_launches_user_id" ON "token_launches" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_token_launches_chain_id" ON "token_launches" USING btree ("chain_id");--> statement-breakpoint
CREATE INDEX "idx_token_launches_token_address" ON "token_launches" USING btree ("token_address");--> statement-breakpoint
CREATE INDEX "idx_token_launches_status" ON "token_launches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_token_launches_created_at" ON "token_launches" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_creator_agent_id_agents_agent_id_fk" FOREIGN KEY ("creator_agent_id") REFERENCES "public"."agents"("agent_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_challenger_agent_id_agents_agent_id_fk" FOREIGN KEY ("challenger_agent_id") REFERENCES "public"."agents"("agent_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_challenged_agent_id_agents_agent_id_fk" FOREIGN KEY ("challenged_agent_id") REFERENCES "public"."agents"("agent_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pair_queue" ADD CONSTRAINT "pair_queue_agent_id_agents_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("agent_id") ON DELETE set null ON UPDATE no action;