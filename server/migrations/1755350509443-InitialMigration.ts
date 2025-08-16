import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1755350509443 implements MigrationInterface {
    name = 'InitialMigration1755350509443'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user_tasks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "task_id" character varying(255) NOT NULL, "task_title" character varying(255), "task_type" character varying(50) NOT NULL, "completed" boolean NOT NULL DEFAULT false, "progress" integer NOT NULL DEFAULT '0', "claimed_at" TIMESTAMP, "reward_amount" numeric(15,2) NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" character varying(228), CONSTRAINT "UQ_09507d389f1ab5061d8dfa38ca5" UNIQUE ("userId", "task_id"), CONSTRAINT "PK_dd5ebb5c408af74cba775bd2326" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_09507d389f1ab5061d8dfa38ca" ON "user_tasks" ("userId", "task_id") `);
        await queryRunner.query(`CREATE TABLE "mining_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying NOT NULL, "start_time" TIMESTAMP NOT NULL, "end_time" TIMESTAMP, "earnings" numeric(15,2) NOT NULL DEFAULT '0', "hash_rate" numeric(10,2) NOT NULL DEFAULT '0', "efficiency" numeric(5,2) NOT NULL DEFAULT '85', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0b5d0db436673e49212c8ce6db3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_04d4a9b318224c0f04ea5e1384" ON "mining_sessions" ("user_id", "start_time") `);
        await queryRunner.query(`CREATE TABLE "user_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "notifications" jsonb NOT NULL DEFAULT '{}', "privacy" jsonb NOT NULL DEFAULT '{}', "mining" jsonb NOT NULL DEFAULT '{}', "display" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_986a2b6d3c05eb4091bb8066f78" UNIQUE ("userId"), CONSTRAINT "REL_986a2b6d3c05eb4091bb8066f7" UNIQUE ("userId"), CONSTRAINT "PK_00f004f5922a0744d174530d639" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "epochs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "epoch_number" integer NOT NULL, "name" character varying(255) NOT NULL, "description" text NOT NULL, "start_date" TIMESTAMP NOT NULL, "end_date" TIMESTAMP NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "rewards_multiplier" numeric(10,2) NOT NULL DEFAULT '1', "special_features" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "hasbadgeofhonor" boolean NOT NULL DEFAULT false, CONSTRAINT "UQ_e74358effd34569da1c0b4b7efa" UNIQUE ("epoch_number"), CONSTRAINT "PK_b4cdb7f1a8e2cf9619060285e6f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a5c356f0da6aa8f6694e19eddc" ON "epochs" ("is_active") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e74358effd34569da1c0b4b7ef" ON "epochs" ("epoch_number") `);
        await queryRunner.query(`CREATE TABLE "user_epoch_stats" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userEarnings" numeric(15,8) NOT NULL DEFAULT '0', "userTasksCompleted" integer NOT NULL DEFAULT '0', "userMiningTime" bigint NOT NULL DEFAULT '0', "userRank" integer NOT NULL DEFAULT '0', "joinedAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" character varying NOT NULL, "epochId" uuid NOT NULL, CONSTRAINT "PK_f5f68f1f8c2114bdacf74427cfd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a58156c7f25728191a07743c9d" ON "user_epoch_stats" ("epochId", "userEarnings") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_3669897dd1026039fa2f18568e" ON "user_epoch_stats" ("userId", "epochId") `);
        await queryRunner.query(`CREATE TABLE "referral_data" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(50) NOT NULL, "totalEarnings" numeric(15,2) NOT NULL DEFAULT '0', "totalReferrals" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "referrerId" character varying NOT NULL, "referredUserId" character varying NOT NULL, CONSTRAINT "UQ_07868b051a4882568c11fe14919" UNIQUE ("code"), CONSTRAINT "PK_31eef1b8245ac39d036ad50ea59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_07868b051a4882568c11fe1491" ON "referral_data" ("code") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_7f457cdded522b3183d3b66c4c" ON "referral_data" ("referrerId", "referredUserId") `);
        await queryRunner.query(`CREATE TABLE "users" ("id" character varying(228) NOT NULL, "username" character varying(255) NOT NULL, "discriminator" character varying(10) NOT NULL, "avatar" character varying(255), "account_age" numeric(10,2) NOT NULL DEFAULT '0', "join_date" TIMESTAMP WITH TIME ZONE NOT NULL, "multiplier" numeric(10,2) NOT NULL DEFAULT '1', "total_earned" numeric(20,8) NOT NULL, "current_balance" numeric(15,2) NOT NULL DEFAULT '0', "is_node_active" boolean, "node_start_time" TIMESTAMP WITH TIME ZONE, "tasks_completed" integer NOT NULL DEFAULT '0', "rank" integer NOT NULL DEFAULT '0', "last_login_time" TIMESTAMP WITH TIME ZONE NOT NULL, "daily_checkin_claimed" boolean NOT NULL DEFAULT false, "weekly_earnings" numeric(15,2) NOT NULL DEFAULT '0', "monthly_earnings" numeric(15,2) NOT NULL DEFAULT '0', "referral_code" character varying(50), "referred_by" character varying(50), "referral_earnings" numeric(15,2) NOT NULL DEFAULT '0', "total_referrals" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "current_epoch_id" character varying(100), "epoch_join_date" TIMESTAMP WITH TIME ZONE, "total_epoch_earnings" numeric(15,2) NOT NULL DEFAULT '0', "lifetime_referral_earnings" numeric(15,2) NOT NULL DEFAULT '0', "last_referral_payout" TIMESTAMP WITH TIME ZONE, "compensation_claimed" boolean NOT NULL DEFAULT false, "hasbadgeofhonor" boolean NOT NULL DEFAULT false, "lastsavedbalance" bigint DEFAULT '0', CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "UQ_ba10055f9ef9690e77cf6445cba" UNIQUE ("referral_code"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ba10055f9ef9690e77cf6445cb" ON "users" ("referral_code") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_fe0bb3f6520ee0469504521e71" ON "users" ("username") `);
        await queryRunner.query(`CREATE TYPE "public"."tasks_type_enum" AS ENUM('daily', 'weekly', 'social', 'achievement')`);
        await queryRunner.query(`CREATE TABLE "tasks" ("id" character varying(255) NOT NULL, "title" character varying(255) NOT NULL, "description" text NOT NULL, "reward" numeric(15,8) NOT NULL, "type" "public"."tasks_type_enum" NOT NULL, "completed" boolean NOT NULL DEFAULT false, "progress" integer NOT NULL DEFAULT '0', "maxProgress" integer NOT NULL DEFAULT '1', "expiresAt" TIMESTAMP, "claimedAt" TIMESTAMP, "socialUrl" character varying(500), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ad3a5efe7abff67d2ec518a217" ON "tasks" ("expiresAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_a43b29dfedb5fce6199328bba8" ON "tasks" ("type") `);
        await queryRunner.query(`CREATE TABLE "node_stats" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "isActive" boolean NOT NULL DEFAULT false, "uptime" bigint NOT NULL DEFAULT '0', "hashRate" numeric(15,8) NOT NULL DEFAULT '0', "dailyEarnings" numeric(15,8) NOT NULL DEFAULT '0', "totalEarnings" numeric(15,8) NOT NULL DEFAULT '0', "efficiency" numeric(5,2) NOT NULL DEFAULT '100', "startTime" bigint, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" character varying NOT NULL, CONSTRAINT "UQ_bc9fe484404c29d4d769eed9720" UNIQUE ("userId"), CONSTRAINT "REL_bc9fe484404c29d4d769eed972" UNIQUE ("userId"), CONSTRAINT "PK_b1f208fc8edecca1f206916c6d3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_bc9fe484404c29d4d769eed972" ON "node_stats" ("userId") `);
        await queryRunner.query(`CREATE TABLE "badge_purchases" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying NOT NULL, "wallet_address" character varying(64) NOT NULL, "transaction_hash" character varying(120) NOT NULL, "amount_sol" numeric(10,6) NOT NULL, "amount_usd" numeric(10,2) NOT NULL, "purchase_date" TIMESTAMP NOT NULL DEFAULT now(), "status" character varying(20) NOT NULL DEFAULT 'pending', CONSTRAINT "UQ_e294fa1dda65d072f08e5d51bc7" UNIQUE ("transaction_hash"), CONSTRAINT "PK_d38e9dc5e66bf7082983081878f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "user_tasks" ADD CONSTRAINT "FK_da349034af45568bdc0ab493140" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "mining_sessions" ADD CONSTRAINT "FK_c94b0ceaad427a27726632670dc" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_settings" ADD CONSTRAINT "FK_986a2b6d3c05eb4091bb8066f78" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_epoch_stats" ADD CONSTRAINT "FK_079fa4ee801a1c084a1e22529cc" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_epoch_stats" ADD CONSTRAINT "FK_c4227a353879d9d9da76b033995" FOREIGN KEY ("epochId") REFERENCES "epochs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "referral_data" ADD CONSTRAINT "FK_045a9f3caaeff4e50b121a92b1a" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "referral_data" ADD CONSTRAINT "FK_097c30f1b38ecd474033b01f0b5" FOREIGN KEY ("referredUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "node_stats" ADD CONSTRAINT "FK_bc9fe484404c29d4d769eed9720" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "badge_purchases" ADD CONSTRAINT "FK_284f89078585afabd7f05bbddde" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "badge_purchases" DROP CONSTRAINT "FK_284f89078585afabd7f05bbddde"`);
        await queryRunner.query(`ALTER TABLE "node_stats" DROP CONSTRAINT "FK_bc9fe484404c29d4d769eed9720"`);
        await queryRunner.query(`ALTER TABLE "referral_data" DROP CONSTRAINT "FK_097c30f1b38ecd474033b01f0b5"`);
        await queryRunner.query(`ALTER TABLE "referral_data" DROP CONSTRAINT "FK_045a9f3caaeff4e50b121a92b1a"`);
        await queryRunner.query(`ALTER TABLE "user_epoch_stats" DROP CONSTRAINT "FK_c4227a353879d9d9da76b033995"`);
        await queryRunner.query(`ALTER TABLE "user_epoch_stats" DROP CONSTRAINT "FK_079fa4ee801a1c084a1e22529cc"`);
        await queryRunner.query(`ALTER TABLE "user_settings" DROP CONSTRAINT "FK_986a2b6d3c05eb4091bb8066f78"`);
        await queryRunner.query(`ALTER TABLE "mining_sessions" DROP CONSTRAINT "FK_c94b0ceaad427a27726632670dc"`);
        await queryRunner.query(`ALTER TABLE "user_tasks" DROP CONSTRAINT "FK_da349034af45568bdc0ab493140"`);
        await queryRunner.query(`DROP TABLE "badge_purchases"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bc9fe484404c29d4d769eed972"`);
        await queryRunner.query(`DROP TABLE "node_stats"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a43b29dfedb5fce6199328bba8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ad3a5efe7abff67d2ec518a217"`);
        await queryRunner.query(`DROP TABLE "tasks"`);
        await queryRunner.query(`DROP TYPE "public"."tasks_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fe0bb3f6520ee0469504521e71"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ba10055f9ef9690e77cf6445cb"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7f457cdded522b3183d3b66c4c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_07868b051a4882568c11fe1491"`);
        await queryRunner.query(`DROP TABLE "referral_data"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3669897dd1026039fa2f18568e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a58156c7f25728191a07743c9d"`);
        await queryRunner.query(`DROP TABLE "user_epoch_stats"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e74358effd34569da1c0b4b7ef"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a5c356f0da6aa8f6694e19eddc"`);
        await queryRunner.query(`DROP TABLE "epochs"`);
        await queryRunner.query(`DROP TABLE "user_settings"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_04d4a9b318224c0f04ea5e1384"`);
        await queryRunner.query(`DROP TABLE "mining_sessions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_09507d389f1ab5061d8dfa38ca"`);
        await queryRunner.query(`DROP TABLE "user_tasks"`);
    }

}
