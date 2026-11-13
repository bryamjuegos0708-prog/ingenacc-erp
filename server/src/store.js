import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { databaseHealth, getDatabase, getDatabasePath, serializeDatabase } from "./db/database.js";
import { StoreRepository } from "./repositories/storeRepository.js";
import { seed } from "./seed.js";
import { operationalSeed } from "./operational-seed.js";

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));
const legacyJsonPath = path.resolve(sourceDirectory, "../data.json");
const collectionKeys = [
  "brands", "locations", "products", "clients", "suppliers", "movements", "invoices", "payments",
  "purchases", "transfers", "returns", "cashSessions", "cashMovements", "users", "quotes", "audit"
];

function prepareSnapshot(source) {
  const data = structuredClone(source);
  for (const key of collectionKeys) {
    if (!Array.isArray(data[key])) data[key] = structuredClone(seed[key] || []);
  }
  data.company = data.company || structuredClone(seed.company);
  data.series = { ...structuredClone(seed.series), ...(data.series || {}) };
  data.schemaVersion = seed.schemaVersion;
  data.users = data.users.map(({ demoPassword, ...user }) => ({
    ...user,
    passwordHash: user.passwordHash || bcrypt.hashSync(
      demoPassword || seed.users.find((demo) => demo.email.toLowerCase() === user.email?.toLowerCase())?.demoPassword || randomUUID(),
      10
    )
  }));
  if (data.payments.length > 0 && data.cashSessions.length === 0) {
    const location = data.locations.find((item) => item.kind === "TIENDA") || data.locations[0];
    const user = data.users[0];
    data.cashSessions.push({
      id:randomUUID(), number:"CJ-MIGRACION", locationId:location.id, userId:user.id, openedBy:"Sistema",
      openedAt:new Date().toISOString(), openingAmount:0, status:"CERRADA", closedAt:new Date().toISOString(),
      closedBy:"Sistema", countedAmount:0, expectedAmount:0, difference:0
    });
  }
  const cashByLocation = new Map(data.cashSessions.map((session) => [session.locationId, session.id]));
  data.invoices = data.invoices.map((invoice) => ({
    ...invoice,
    cashSessionId:invoice.cashSessionId ?? cashByLocation.get(invoice.locationId) ?? null
  }));
  const invoices = new Map(data.invoices.map((invoice) => [invoice.id, invoice]));
  data.payments = data.payments.map((payment) => {
    const invoice = invoices.get(payment.invoiceId);
    return {
      ...payment,
      cashSessionId:payment.cashSessionId || invoice?.cashSessionId || cashByLocation.get(invoice?.locationId) || data.cashSessions[0]?.id
    };
  });
  return data;
}

function repository() {
  return new StoreRepository(getDatabase());
}

function ensureInitialized() {
  const storeRepository = repository();
  if (!storeRepository.isEmpty()) return storeRepository;
  const testRun = process.argv.some((value) => value.includes(".test."));
  const demoSeed = process.env.INGENACC_SEED_MODE === "demo" || (!process.env.INGENACC_SEED_MODE && testRun);
  const initial = fs.existsSync(legacyJsonPath)
    ? JSON.parse(fs.readFileSync(legacyJsonPath, "utf8"))
    : (demoSeed ? seed : operationalSeed);
  storeRepository.replaceSnapshot(prepareSnapshot(initial));
  return storeRepository;
}

export function readStore() {
  return ensureInitialized().readSnapshot();
}

export function writeStore(data) {
  ensureInitialized().replaceSnapshot(data);
  return data;
}

export function totalStock(product) {
  return Object.values(product.stock).reduce((sum, value) => sum + value, 0);
}

export function createDatabaseBackup() {
  ensureInitialized();
  return serializeDatabase();
}

export function storageHealth() {
  const data = readStore();
  const health = databaseHealth();
  return {
    engine: "SQLite",
    file: path.basename(getDatabasePath()),
    journalMode: health.journalMode.toUpperCase(),
    foreignKeys: health.foreignKeyErrors.length === 0,
    schemaVersion: data.schemaVersion,
    integrity: health.integrity,
    migrationsApplied: health.migrationsApplied
  };
}

export function databaseFilePath() {
  return getDatabasePath();
}
