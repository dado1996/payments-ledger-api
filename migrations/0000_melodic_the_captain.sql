CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"currency" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_currency_check" CHECK ("accounts"."currency" IN ('USD', 'EUR', 'GBP', 'COP'))
);
--> statement-breakpoint
CREATE TABLE "entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"transfer_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entries_amount_check" CHECK ("entries"."amount" <> 0)
);
--> statement-breakpoint
CREATE TABLE "transfers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"currency" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"metadata" text,
	CONSTRAINT "transfers_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "transfers_currency_check" CHECK ("transfers"."currency" IN ('USD', 'EUR', 'GBP', 'COP'))
);
--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_transfer_id_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."transfers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entries_transfer_id_idx" ON "entries" USING btree ("transfer_id");--> statement-breakpoint
CREATE INDEX "entries_account_id_idx" ON "entries" USING btree ("account_id");