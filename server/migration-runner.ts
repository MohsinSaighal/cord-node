import { DataSource } from 'typeorm';
import { dataSource } from './data-source'; // adjust path as needed

async function runMigrations() {
    await dataSource.initialize();
    await dataSource.runMigrations();
    await dataSource.destroy();
    console.log('Migrations completed!');
}

async function dropSchema() {
    await dataSource.initialize();
    await dataSource.dropDatabase();
    await dataSource.destroy();
    console.log('Schema dropped!');
}

async function syncSchema() {
    await dataSource.initialize();
    await dataSource.synchronize();
    await dataSource.destroy();
    console.log('Schema synchronized!');
}

const command = process.argv[2];
switch (command) {
    case 'migrate':
        runMigrations();
        break;
    case 'drop':
        dropSchema();
        break;
    case 'sync':
        syncSchema();
        break;
    default:
        console.log('Available commands: migrate, drop, sync');
}