import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserTable1754676703176 implements MigrationInterface {
    name = 'AddUserTable1754676703176'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "epochs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "epochNumber" integer NOT NULL, "name" character varying(255) NOT NULL, "description" text NOT NULL, "startDate" TIMESTAMP NOT NULL, "endDate" TIMESTAMP NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "rewardsMultiplier" numeric(10,2) NOT NULL DEFAULT '1', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_2d748c0a4350eb962075fd43679" UNIQUE ("epochNumber"), CONSTRAINT "PK_b4cdb7f1a8e2cf9619060285e6f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_dcc470bf80c9c0601f8d0e207b" ON "epochs" ("isActive") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_2d748c0a4350eb962075fd4367" ON "epochs" ("epochNumber") `);
        await queryRunner.query(`CREATE TABLE "user_epoch_stats" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userEarnings" numeric(15,8) NOT NULL DEFAULT '0', "userTasksCompleted" integer NOT NULL DEFAULT '0', "userMiningTime" bigint NOT NULL DEFAULT '0', "userRank" integer NOT NULL DEFAULT '0', "joinedAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" character varying NOT NULL, "epochId" uuid NOT NULL, CONSTRAINT "PK_f5f68f1f8c2114bdacf74427cfd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a58156c7f25728191a07743c9d" ON "user_epoch_stats" ("epochId", "userEarnings") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_3669897dd1026039fa2f18568e" ON "user_epoch_stats" ("userId", "epochId") `);
        await queryRunner.query(`CREATE TABLE "referral_data" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(50) NOT NULL, "totalEarnings" numeric(15,8) NOT NULL DEFAULT '0', "totalReferrals" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "referrerId" character varying NOT NULL, "referredUserId" character varying NOT NULL, CONSTRAINT "UQ_07868b051a4882568c11fe14919" UNIQUE ("code"), CONSTRAINT "PK_31eef1b8245ac39d036ad50ea59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_07868b051a4882568c11fe1491" ON "referral_data" ("code") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_7f457cdded522b3183d3b66c4c" ON "referral_data" ("referrerId", "referredUserId") `);
        await queryRunner.query(`CREATE TABLE "user_tasks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "taskId" character varying(255) NOT NULL, "completed" boolean NOT NULL DEFAULT false, "progress" integer NOT NULL DEFAULT '0', "claimedAt" TIMESTAMP, "reward" numeric(15,8) NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_07df033b0b61ee58ded3168bf2a" UNIQUE ("userId", "taskId"), CONSTRAINT "PK_dd5ebb5c408af74cba775bd2326" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_07df033b0b61ee58ded3168bf2" ON "user_tasks" ("userId", "taskId") `);
        await queryRunner.query(`CREATE TABLE "mining_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "startTime" TIMESTAMP NOT NULL, "endTime" TIMESTAMP, "earnings" numeric(15,8) NOT NULL DEFAULT '0', "hashRate" numeric(10,2) NOT NULL DEFAULT '0', "efficiency" numeric(5,2) NOT NULL DEFAULT '85', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0b5d0db436673e49212c8ce6db3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8cab5039cffadfc83d44dc2aa0" ON "mining_sessions" ("userId", "startTime") `);
        await queryRunner.query(`CREATE TABLE "user_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "notifications" jsonb NOT NULL DEFAULT '{}', "privacy" jsonb NOT NULL DEFAULT '{}', "mining" jsonb NOT NULL DEFAULT '{}', "display" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_986a2b6d3c05eb4091bb8066f78" UNIQUE ("userId"), CONSTRAINT "REL_986a2b6d3c05eb4091bb8066f7" UNIQUE ("userId"), CONSTRAINT "PK_00f004f5922a0744d174530d639" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" character varying(36) NOT NULL, "username" character varying(255) NOT NULL, "discriminator" character varying(10) NOT NULL, "avatar" character varying(255), "account_age" numeric(10,2) NOT NULL DEFAULT '0', "join_date" TIMESTAMP NOT NULL, "multiplier" numeric(10,2) NOT NULL DEFAULT '1', "compensationClaimed" boolean NOT NULL DEFAULT false, "hasbadgeofhonor" boolean NOT NULL DEFAULT false, "total_earned" numeric(15,2) NOT NULL DEFAULT '0', "current_balance" numeric(15,2) NOT NULL DEFAULT '0', "is_node_active" boolean NOT NULL DEFAULT false, "tasksCompleted" integer NOT NULL DEFAULT '0', "rank" integer NOT NULL DEFAULT '0', "nodeStartTime" bigint, "last_login_time" bigint NOT NULL DEFAULT EXTRACT(epoch FROM NOW()) * 1000, "daily_checkin_claimed" boolean NOT NULL DEFAULT false, "weekly_earnings" numeric(15,2) NOT NULL DEFAULT '0', "monthly_earnings" numeric(15,2) NOT NULL DEFAULT '0', "referralCode" character varying(50), "referredBy" character varying(50), "referralEarnings" numeric(15,2) NOT NULL DEFAULT '0', "totalReferrals" integer NOT NULL DEFAULT '0', "currentEpochId" character varying(100), "epochJoinDate" bigint, "totalEpochEarnings" numeric(15,2) NOT NULL DEFAULT '0', "lastSavedBalance" numeric(15,2), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "UQ_b7f8278f4e89249bb75c9a15899" UNIQUE ("referralCode"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b7f8278f4e89249bb75c9a1589" ON "users" ("referralCode") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_fe0bb3f6520ee0469504521e71" ON "users" ("username") `);
        await queryRunner.query(`CREATE TYPE "public"."tasks_type_enum" AS ENUM('daily', 'weekly', 'social', 'achievement')`);
        await queryRunner.query(`CREATE TABLE "tasks" ("id" character varying(255) NOT NULL, "title" character varying(255) NOT NULL, "description" text NOT NULL, "reward" numeric(15,8) NOT NULL, "type" "public"."tasks_type_enum" NOT NULL, "completed" boolean NOT NULL DEFAULT false, "progress" integer NOT NULL DEFAULT '0', "maxProgress" integer NOT NULL DEFAULT '1', "expiresAt" TIMESTAMP, "claimedAt" TIMESTAMP, "socialUrl" character varying(500), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ad3a5efe7abff67d2ec518a217" ON "tasks" ("expiresAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_a43b29dfedb5fce6199328bba8" ON "tasks" ("type") `);
        await queryRunner.query(`CREATE TABLE "node_stats" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "isActive" boolean NOT NULL DEFAULT false, "uptime" bigint NOT NULL DEFAULT '0', "hashRate" numeric(15,8) NOT NULL DEFAULT '0', "dailyEarnings" numeric(15,8) NOT NULL DEFAULT '0', "totalEarnings" numeric(15,8) NOT NULL DEFAULT '0', "efficiency" numeric(5,2) NOT NULL DEFAULT '100', "startTime" bigint, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" character varying NOT NULL, CONSTRAINT "UQ_bc9fe484404c29d4d769eed9720" UNIQUE ("userId"), CONSTRAINT "REL_bc9fe484404c29d4d769eed972" UNIQUE ("userId"), CONSTRAINT "PK_b1f208fc8edecca1f206916c6d3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_bc9fe484404c29d4d769eed972" ON "node_stats" ("userId") `);
        await queryRunner.query(`ALTER TABLE "user_epoch_stats" ADD CONSTRAINT "FK_079fa4ee801a1c084a1e22529cc" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_epoch_stats" ADD CONSTRAINT "FK_c4227a353879d9d9da76b033995" FOREIGN KEY ("epochId") REFERENCES "epochs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "referral_data" ADD CONSTRAINT "FK_045a9f3caaeff4e50b121a92b1a" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "referral_data" ADD CONSTRAINT "FK_097c30f1b38ecd474033b01f0b5" FOREIGN KEY ("referredUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_tasks" ADD CONSTRAINT "FK_83e94423ca0675e4ac503d86413" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "mining_sessions" ADD CONSTRAINT "FK_c7a0e90404f73bae68e9ec135b8" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_settings" ADD CONSTRAINT "FK_986a2b6d3c05eb4091bb8066f78" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "node_stats" ADD CONSTRAINT "FK_bc9fe484404c29d4d769eed9720" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "node_stats" DROP CONSTRAINT "FK_bc9fe484404c29d4d769eed9720"`);
        await queryRunner.query(`ALTER TABLE "user_settings" DROP CONSTRAINT "FK_986a2b6d3c05eb4091bb8066f78"`);
        await queryRunner.query(`ALTER TABLE "mining_sessions" DROP CONSTRAINT "FK_c7a0e90404f73bae68e9ec135b8"`);
        await queryRunner.query(`ALTER TABLE "user_tasks" DROP CONSTRAINT "FK_83e94423ca0675e4ac503d86413"`);
        await queryRunner.query(`ALTER TABLE "referral_data" DROP CONSTRAINT "FK_097c30f1b38ecd474033b01f0b5"`);
        await queryRunner.query(`ALTER TABLE "referral_data" DROP CONSTRAINT "FK_045a9f3caaeff4e50b121a92b1a"`);
        await queryRunner.query(`ALTER TABLE "user_epoch_stats" DROP CONSTRAINT "FK_c4227a353879d9d9da76b033995"`);
        await queryRunner.query(`ALTER TABLE "user_epoch_stats" DROP CONSTRAINT "FK_079fa4ee801a1c084a1e22529cc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bc9fe484404c29d4d769eed972"`);
        await queryRunner.query(`DROP TABLE "node_stats"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a43b29dfedb5fce6199328bba8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ad3a5efe7abff67d2ec518a217"`);
        await queryRunner.query(`DROP TABLE "tasks"`);
        await queryRunner.query(`DROP TYPE "public"."tasks_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fe0bb3f6520ee0469504521e71"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b7f8278f4e89249bb75c9a1589"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "user_settings"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8cab5039cffadfc83d44dc2aa0"`);
        await queryRunner.query(`DROP TABLE "mining_sessions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_07df033b0b61ee58ded3168bf2"`);
        await queryRunner.query(`DROP TABLE "user_tasks"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7f457cdded522b3183d3b66c4c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_07868b051a4882568c11fe1491"`);
        await queryRunner.query(`DROP TABLE "referral_data"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3669897dd1026039fa2f18568e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a58156c7f25728191a07743c9d"`);
        await queryRunner.query(`DROP TABLE "user_epoch_stats"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2d748c0a4350eb962075fd4367"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dcc470bf80c9c0601f8d0e207b"`);
        await queryRunner.query(`DROP TABLE "epochs"`);
    }

}
