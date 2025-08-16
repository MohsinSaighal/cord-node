import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFields1755307406880 implements MigrationInterface {
    name = 'AddNewFields1755307406880'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "is_node_active" boolean DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "is_node_active"`);
    }

}
