declare const require: any;

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';

let SQLConstructor: any = null;

async function getSQL() {
  if (!SQLConstructor) {
    const initSqlJs = require('sql.js');
    SQLConstructor = await initSqlJs();
  }
  return SQLConstructor;
}

class SqlJsStatement {
  private stmt: any;
  constructor(stmt: any) {
    this.stmt = stmt;
  }
  run(...params: any[]): void {
    const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    this.stmt.bind(args);
    this.stmt.step();
    this.stmt.reset();
  }
  all(...params: any[]): any[] {
    const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    this.stmt.bind(args);
    const results: any[] = [];
    while (this.stmt.step()) {
      results.push(this.stmt.getAsObject());
    }
    this.stmt.reset();
    return results;
  }
  get(...params: any[]): any {
    const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    this.stmt.bind(args);
    if (this.stmt.step()) {
      const row = this.stmt.getAsObject();
      this.stmt.reset();
      return row;
    }
    this.stmt.reset();
    return undefined;
  }
}

export class SqlJsDB {
  private dbPath: string;
  private db: any = null;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  async init(): Promise<void> {
    const SQL = await getSQL();
    if (existsSync(this.dbPath)) {
      const data = readFileSync(this.dbPath);
      this.db = new SQL.Database(new Uint8Array(data));
    } else {
      this.db = new SQL.Database();
    }
  }

  prepare(sql: string) {
    if (!this.db) throw new Error('DB not initialized');
    const stmt = this.db.prepare(sql);
    return new SqlJsStatement(stmt);
  }

  exec(sql: string): void {
    if (!this.db) throw new Error('DB not initialized');
    this.db.run(sql);
  }

  pragma(sql: string): void {
    this.exec(sql);
  }

  close(): void {
    if (!this.db) return;
    try {
      const data = this.db.export();
      writeFileSync(this.dbPath, Buffer.from(data));
    } catch {}
  }
}

export function getDatabasePath(): string {
  const userData = app.getPath('userData');
  return join(userData, 'bpb-auto-setup.db');
}

let dbInstance: SqlJsDB | null = null;

export async function initializeDatabase(): Promise<SqlJsDB> {
  const dbPath = getDatabasePath();
  dbInstance = new SqlJsDB(dbPath);
  await dbInstance.init();
  // Run schema (idempotent)
  const schema = readFileSync(join(__dirname, '..', 'database', 'schema.sql'), 'utf-8');
  dbInstance.exec(schema);
  runMigrations(dbInstance);
  return dbInstance;
}

function runMigrations(db: SqlJsDB): void {
  const migrationsDir = join(__dirname, '..', 'database', 'migrations');
  // Future migrations
}

export function getDb(): SqlJsDB {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return dbInstance;
}

export function closeDatabase(db: SqlJsDB): void {
  db.close();
}
