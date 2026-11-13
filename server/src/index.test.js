import test from "node:test";
import assert from "node:assert/strict";
import { calculateCashExpected } from "./index.js";

test("el arqueo de caja solo suma efectivo físico", () => {
  const db = {
    cashSessions: [{ id:"cash-test", openingAmount:100 }],
    cashMovements: [
      { cashSessionId:"cash-test", type:"INGRESO", amount:250, method:"EFECTIVO" },
      { cashSessionId:"cash-test", type:"INGRESO", amount:900, method:"TRANSFERENCIA" },
      { cashSessionId:"cash-test", type:"EGRESO", amount:40, method:"EFECTIVO" },
      { cashSessionId:"cash-test", type:"EGRESO", amount:15, method:"TARJETA" }
    ]
  };

  assert.equal(calculateCashExpected(db, "cash-test"), 310);
});

test("una caja inexistente tiene saldo esperado cero", () => {
  assert.equal(calculateCashExpected({ cashSessions:[], cashMovements:[] }, "missing"), 0);
});
