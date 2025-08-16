import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFields1755307511793 implements MigrationInterface {
    name = 'AddNewFields1755307511793'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "nodeStartTime" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "nodeStartTime"`);
    }

}
