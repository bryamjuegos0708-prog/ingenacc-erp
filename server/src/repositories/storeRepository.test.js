import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { applyMigrations, getDatabasePath } from "../db/database.js";
import { seed } from "../seed.js";
import { StoreRepository } from "./storeRepository.js";

function createFixture() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  applyMigrations(database);
  const repository = new StoreRepository(database);
  const snapshot = structuredClone(seed);
  snapshot.users = snapshot.users.map(({ demoPassword: _demoPassword, ...user }) => ({ ...user, passwordHash:"hash-de-prueba" }));
  return { database, repository, snapshot };
}

test("el repositorio guarda y reconstruye el estado operacional normalizado", (t) => {
  const { database, repository, snapshot } = createFixture();
  t.after(() => database.close());

  assert.equal(repository.isEmpty(), true);
  repository.replaceSnapshot(snapshot);
  const restored = repository.readSnapshot();

  assert.equal(repository.isEmpty(), false);
  assert.equal(restored.schemaVersion, 4);
  assert.equal(restored.products.length, snapshot.products.length);
  assert.deepEqual(restored.products[0].stock, snapshot.products[0].stock);
  assert.deepEqual(restored.invoices[0].items, snapshot.invoices[0].items);
  assert.deepEqual(restored.purchases[0].items, snapshot.purchases[0].items.map(line => ({...line, receivedQuantity:line.quantity})));
  assert.equal(restored.users[0].passwordHash, "hash-de-prueba");
  assert.deepEqual(database.prepare("PRAGMA foreign_key_check").all(), []);
  assert.equal(Number(database.prepare("SELECT COUNT(*) AS count FROM schema_migrations").get().count), 7);
});

test("una escritura inválida revierte toda la transacción", (t) => {
  const { database, repository, snapshot } = createFixture();
  t.after(() => database.close());
  repository.replaceSnapshot(snapshot);
  const invalid = structuredClone(snapshot);
  invalid.users[0].locationId = "ubicacion-inexistente";

  assert.throws(() => repository.replaceSnapshot(invalid), /FOREIGN KEY constraint failed/);
  const restored = repository.readSnapshot();
  assert.equal(restored.users[0].locationId, snapshot.users[0].locationId);
  assert.equal(restored.products.length, snapshot.products.length);
  assert.deepEqual(database.prepare("PRAGMA foreign_key_check").all(), []);
});

test("las migraciones son idempotentes", (t) => {
  const { database } = createFixture();
  t.after(() => database.close());
  applyMigrations(database);
  assert.equal(Number(database.prepare("SELECT COUNT(*) AS count FROM schema_migrations").get().count), 7);
});

test("DATABASE_PATH relativo se resuelve desde la raíz del proyecto", () => {
  const previous = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = "./server/data/prueba.db";
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
  assert.equal(getDatabasePath(), path.resolve(projectRoot, "server/data/prueba.db"));
  if (previous === undefined) delete process.env.DATABASE_PATH;
  else process.env.DATABASE_PATH = previous;
});
