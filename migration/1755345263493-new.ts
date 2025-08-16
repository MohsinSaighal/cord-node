import { MigrationInterface, QueryRunner } from "typeorm";

export class New1755345263493 implements MigrationInterface {
    name = 'New1755345263493'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "total_earned" TYPE numeric(20,8)`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "total_earned" DROP DEFAULT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "total_earned" SET DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "total_earned" TYPE numeric(15,2)`);
    }

}
