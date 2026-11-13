import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { getDatabase } from "./database.js";
import { databaseFilePath, readStore, storageHealth } from "../store.js";

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path:path.resolve(sourceDirectory, "../../../.env") });

const snapshot = readStore();
const health = storageHealth();
const database = getDatabase();
const tables = ["products", "inventory_stock", "clients", "suppliers", "invoices", "payments", "purchases", "users", "audit_log"];
const records = Object.fromEntries(tables.map((table) => [
  table,
  Number(database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count)
]));

console.log(JSON.stringify({
  ok:health.integrity === "ok" && health.foreignKeys,
  database:databaseFilePath(),
  engine:health.engine,
  journalMode:health.journalMode,
  schemaVersion:snapshot.schemaVersion,
  migrationsApplied:health.migrationsApplied,
  integrity:health.integrity,
  foreignKeys:health.foreignKeys,
  records
}, null, 2));

if (health.integrity !== "ok" || !health.foreignKeys) process.exitCode = 1;
