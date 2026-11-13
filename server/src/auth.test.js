import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";

const databasePath = path.join(os.tmpdir(), `ingenacc-auth-${randomUUID()}.db`);
process.env.DATABASE_PATH = databasePath;
process.env.JWT_SECRET = randomBytes(48).toString("base64url");

const { app } = await import("./index.js");
const { closeDatabase } = await import("./db/database.js");
const { testCredentials } = await import("./seed.js");

async function login(baseUrl, email, password) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method:"POST",
    headers:{ "content-type":"application/json" },
    body:JSON.stringify({ email, password })
  });
  return { response, body:await response.json() };
}

test("las cinco credenciales demo inician sesión y el correo se normaliza", async (t) => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    closeDatabase();
    for (const suffix of ["", "-wal", "-shm"]) fs.rmSync(`${databasePath}${suffix}`, { force:true });
  });
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const publicResponse = await fetch(`${baseUrl}/api/public/bootstrap`);
  const publicData = (await publicResponse.json()).data;
  assert.ok(publicData.products.length > 0);
  for (const product of publicData.products) {
    assert.equal("costPrice" in product, false);
    assert.equal("stock" in product, false);
    assert.equal("barcode" in product, false);
  }
  assert.ok(publicData.locations.every((item) => item.kind === "TIENDA"));
  const accounts = [
    ["  GERENCIA@INGENACC.PE  ", testCredentials.manager, "GERENTE"],
    ["jefe@ingenacc.pe", testCredentials.chief, "JEFE"],
    ["caja@ingenacc.pe", testCredentials.cashier, "ADMINISTRACION"],
    ["ventas@ingenacc.pe", testCredentials.sales, "VENTAS"],
    ["almacen@ingenacc.pe", testCredentials.warehouse, "ALMACEN"]
  ];

  for (const [email, password, role] of accounts) {
    const result = await login(baseUrl, email, password);
    assert.equal(result.response.status, 200);
    assert.equal(result.body.data.user.role, role);
    assert.ok(result.body.data.token);
    const headers = { Authorization: `Bearer ${result.body.data.token}` };
    const snapshot = (await (await fetch(`${baseUrl}/api/bootstrap`, { headers })).json()).data;
    assert.equal("series" in snapshot, false);
    assert.ok(snapshot.users.every((item) => !("passwordHash" in item)));
    if (!["GERENTE","JEFE"].includes(role)) assert.equal(snapshot.users.length, 1);
    if (role === "ALMACEN") {
      for (const key of ["clients", "invoices", "payments", "cashMovements", "cashSessions", "quotes", "audit"]) assert.deepEqual(snapshot[key], []);
      const denied = await fetch(`${baseUrl}/api/sales`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: "{}" });
      assert.equal(denied.status, 403);
    }
    if (role === "VENTAS") {
      for (const key of ["purchases", "suppliers", "audit", "cashMovements"]) assert.deepEqual(snapshot[key], []);
      const denied = await fetch(`${baseUrl}/api/backups/database`, { headers });
      assert.equal(denied.status, 403);
    }
  }

  const invalid = await login(baseUrl, "gerencia@ingenacc.pe", randomBytes(32).toString("base64url"));
  assert.equal(invalid.response.status, 401);
  assert.equal(invalid.body.message, "Credenciales incorrectas.");
});
