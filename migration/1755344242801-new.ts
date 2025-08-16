import { MigrationInterface, QueryRunner } from "typeorm";

export class New1755344242801 implements MigrationInterface {
    name = 'New1755344242801'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_09507d389f1ab5061d8dfa38ca"`);
        await queryRunner.query(`ALTER TABLE "user_tasks" DROP CONSTRAINT "UQ_09507d389f1ab5061d8dfa38ca5"`);
        await queryRunner.query(`ALTER TABLE "user_tasks" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "user_tasks" ADD "userId" character varying NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_09507d389f1ab5061d8dfa38ca" ON "user_tasks" ("userId", "task_id") `);
        await queryRunner.query(`ALTER TABLE "user_tasks" ADD CONSTRAINT "UQ_09507d389f1ab5061d8dfa38ca5" UNIQUE ("userId", "task_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_tasks" DROP CONSTRAINT "UQ_09507d389f1ab5061d8dfa38ca5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_09507d389f1ab5061d8dfa38ca"`);
        await queryRunner.query(`ALTER TABLE "user_tasks" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "user_tasks" ADD "userId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user_tasks" ADD CONSTRAINT "UQ_09507d389f1ab5061d8dfa38ca5" UNIQUE ("userId", "task_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_09507d389f1ab5061d8dfa38ca" ON "user_tasks" ("userId", "task_id") `);
    }

}
