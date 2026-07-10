-- Migration: add Gen1 economy tables (tools, inventories, installs, listings)

CREATE TABLE IF NOT EXISTS "gen1_tools" (
  "tool_id" uuid PRIMARY KEY NOT NULL,
  "tool_key" varchar(128) UNIQUE NOT NULL,
  "name" varchar(255) NOT NULL,
  "rarity" varchar(32) NOT NULL,
  "season" integer NOT NULL DEFAULT 1,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "total_supply" integer DEFAULT 0,
  "mintable" boolean DEFAULT true,
  "price" numeric(30,8),
  "currency" varchar(16),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "gen1_inventories" (
  "id" serial PRIMARY KEY NOT NULL,
  "owner_user_id" varchar(255) REFERENCES "users"("id") ON DELETE CASCADE,
  "tool_id" uuid REFERENCES "gen1_tools"("tool_id") ON DELETE CASCADE,
  "quantity" integer NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_gen1_inventories_owner_user_id" ON "gen1_inventories"("owner_user_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "gen1_tool_installs" (
  "id" serial PRIMARY KEY NOT NULL,
  "fighter_agent_id" varchar(180) REFERENCES "bota_fighter_profiles"("agent_id") ON DELETE CASCADE,
  "owner_user_id" varchar(255) REFERENCES "users"("id") ON DELETE SET NULL,
  "tool_id" uuid REFERENCES "gen1_tools"("tool_id") ON DELETE SET NULL,
  "season" integer NOT NULL DEFAULT 1,
  "installed_at" timestamp DEFAULT now(),
  "removed_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_gen1_tool_installs_fighter_agent_id" ON "gen1_tool_installs"("fighter_agent_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "gen1_listings" (
  "listing_id" uuid PRIMARY KEY NOT NULL,
  "seller_user_id" varchar(255) REFERENCES "users"("id") ON DELETE SET NULL,
  "fighter_agent_id" varchar(180) REFERENCES "bota_fighter_profiles"("agent_id") ON DELETE SET NULL,
  "tool_id" uuid REFERENCES "gen1_tools"("tool_id") ON DELETE SET NULL,
  "price" numeric(30,8) NOT NULL,
  "currency" varchar(16) NOT NULL DEFAULT 'BC',
  "status" varchar(24) NOT NULL DEFAULT 'open',
  "reserved_by" varchar(255),
  "reserved_until" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_gen1_listings_status" ON "gen1_listings"("status");
--> statement-breakpoint
