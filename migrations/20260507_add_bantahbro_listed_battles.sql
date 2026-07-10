CREATE TABLE IF NOT EXISTS "bantahbro_listed_battles" (
  "id" varchar(255) PRIMARY KEY NOT NULL,
  "engine_battle_id" varchar(255) NOT NULL UNIQUE,
  "status" varchar(24) NOT NULL DEFAULT 'listed',
  "source" varchar(24) NOT NULL DEFAULT 'engine',
  "listed_by" varchar(255),
  "battle" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "listed_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_bantahbro_listed_battles_engine_id"
  ON "bantahbro_listed_battles" ("engine_battle_id");

CREATE INDEX IF NOT EXISTS "idx_bantahbro_listed_battles_listed_at"
  ON "bantahbro_listed_battles" ("listed_at");

CREATE INDEX IF NOT EXISTS "idx_bantahbro_listed_battles_source"
  ON "bantahbro_listed_battles" ("source");
