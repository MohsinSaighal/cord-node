import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserTable1754598072877 implements MigrationInterface {
    name = 'AddUserTable1754598072877'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_166bd96559cb38595d392f75a35"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fa47e06ef2f4fe576fee0dab1f"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "userId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user_epoch_stats" DROP CONSTRAINT "FK_079fa4ee801a1c084a1e22529cc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3669897dd1026039fa2f18568e"`);
        await queryRunner.query(`ALTER TABLE "user_epoch_stats" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "user_epoch_stats" ADD "userId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "referral_data" DROP CONSTRAINT "FK_045a9f3caaeff4e50b121a92b1a"`);
        await queryRunner.query(`ALTER TABLE "referral_data" DROP CONSTRAINT "FK_097c30f1b38ecd474033b01f0b5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7f457cdded522b3183d3b66c4c"`);
        await queryRunner.query(`ALTER TABLE "referral_data" DROP COLUMN "referrerId"`);
        await queryRunner.query(`ALTER TABLE "referral_data" ADD "referrerId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "referral_data" DROP COLUMN "referredUserId"`);
        await queryRunner.query(`ALTER TABLE "referral_data" ADD "referredUserId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "node_stats" DROP CONSTRAINT "FK_bc9fe484404c29d4d769eed9720"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "id" character varying(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "lastLoginTime" SET DEFAULT EXTRACT(epoch FROM NOW()) * 1000`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bc9fe484404c29d4d769eed972"`);
        await queryRunner.query(`ALTER TABLE "node_stats" DROP CONSTRAINT "UQ_bc9fe484404c29d4d769eed9720"`);
        await queryRunner.query(`ALTER TABLE "node_stats" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "node_stats" ADD "userId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "node_stats" ADD CONSTRAINT "UQ_bc9fe484404c29d4d769eed9720" UNIQUE ("userId")`);
        await queryRunner.query(`CREATE INDEX "IDX_fa47e06ef2f4fe576fee0dab1f" ON "tasks" ("userId", "type") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_3669897dd1026039fa2f18568e" ON "user_epoch_stats" ("userId", "epochId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_7f457cdded522b3183d3b66c4c" ON "referral_data" ("referrerId", "referredUserId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_bc9fe484404c29d4d769eed972" ON "node_stats" ("userId") `);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_166bd96559cb38595d392f75a35" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_epoch_stats" ADD CONSTRAINT "FK_079fa4ee801a1c084a1e22529cc" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "referral_data" ADD CONSTRAINT "FK_045a9f3caaeff4e50b121a92b1a" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "referral_data" ADD CONSTRAINT "FK_097c30f1b38ecd474033b01f0b5" FOREIGN KEY ("referredUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "node_stats" ADD CONSTRAINT "FK_bc9fe484404c29d4d769eed9720" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "node_stats" DROP CONSTRAINT "FK_bc9fe484404c29d4d769eed9720"`);
        await queryRunner.query(`ALTER TABLE "referral_data" DROP CONSTRAINT "FK_097c30f1b38ecd474033b01f0b5"`);
        await queryRunner.query(`ALTER TABLE "referral_data" DROP CONSTRAINT "FK_045a9f3caaeff4e50b121a92b1a"`);
        await queryRunner.query(`ALTER TABLE "user_epoch_stats" DROP CONSTRAINT "FK_079fa4ee801a1c084a1e22529cc"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_166bd96559cb38595d392f75a35"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bc9fe484404c29d4d769eed972"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7f457cdded522b3183d3b66c4c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3669897dd1026039fa2f18568e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fa47e06ef2f4fe576fee0dab1f"`);
        await queryRunner.query(`ALTER TABLE "node_stats" DROP CONSTRAINT "UQ_bc9fe484404c29d4d769eed9720"`);
        await queryRunner.query(`ALTER TABLE "node_stats" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "node_stats" ADD "userId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "node_stats" ADD CONSTRAINT "UQ_bc9fe484404c29d4d769eed9720" UNIQUE ("userId")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_bc9fe484404c29d4d769eed972" ON "node_stats" ("userId") `);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "lastLoginTime" SET DEFAULT (EXTRACT(epoch FROM now()) * (1000))`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "node_stats" ADD CONSTRAINT "FK_bc9fe484404c29d4d769eed9720" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "referral_data" DROP COLUMN "referredUserId"`);
        await queryRunner.query(`ALTER TABLE "referral_data" ADD "referredUserId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "referral_data" DROP COLUMN "referrerId"`);
        await queryRunner.query(`ALTER TABLE "referral_data" ADD "referrerId" uuid NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_7f457cdded522b3183d3b66c4c" ON "referral_data" ("referrerId", "referredUserId") `);
        await queryRunner.query(`ALTER TABLE "referral_data" ADD CONSTRAINT "FK_097c30f1b38ecd474033b01f0b5" FOREIGN KEY ("referredUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "referral_data" ADD CONSTRAINT "FK_045a9f3caaeff4e50b121a92b1a" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_epoch_stats" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "user_epoch_stats" ADD "userId" uuid NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_3669897dd1026039fa2f18568e" ON "user_epoch_stats" ("userId", "epochId") `);
        await queryRunner.query(`ALTER TABLE "user_epoch_stats" ADD CONSTRAINT "FK_079fa4ee801a1c084a1e22529cc" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "userId" uuid NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_fa47e06ef2f4fe576fee0dab1f" ON "tasks" ("type", "userId") `);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_166bd96559cb38595d392f75a35" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
