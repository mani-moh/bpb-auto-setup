import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';

export function getDatabasePath(): string {
  const userData = app.getPath('userData');
  return join(userData, 'bpb-auto-setup.db');
}

export function initializeDatabase(): Database.Database {
  const dbPath = getDatabasePath();
  const db = new Database(dbPath);

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  // Run schema
  const schema = readFileSync(join(__dirname, '..', 'database', 'schema.sql'), 'utf-8');
  db.exec(schema);

  // Run migrations
  runMigrations(db);

  return db;
}

function runMigrations(db: Database.Database): void {
  const migrationsDir = join(__dirname, '..', 'database', 'migrations');
  // Future migrations would go here
  // For now, schema.sql handles initial creation
}

export function closeDatabase(db: Database.Database): void {
  db.close();
}