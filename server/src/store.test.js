import test from "node:test";
import assert from "node:assert/strict";
import { totalStock } from "./store.js";

test("totalStock suma las existencias de todas las ubicaciones", () => {
  assert.equal(totalStock({ stock: { tienda: 2, almacen: 7, piso: 1 } }), 10);
});
