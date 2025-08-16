import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1755337151632 implements MigrationInterface {
    name = 'Migrations1755337151632'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "lastSavedBalance" bigint DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "lastSavedBalance"`);
    }

}
