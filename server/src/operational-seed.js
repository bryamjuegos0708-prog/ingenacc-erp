import { seed } from "./seed.js";

const empty = ["products","clients","suppliers","movements","invoices","payments","purchases","transfers","returns","cashSessions","cashMovements","users","quotes","audit"];
export const operationalSeed = structuredClone(seed);
operationalSeed.demoMode = false;
for (const key of empty) operationalSeed[key] = [];
for (const serial of Object.values(operationalSeed.series)) serial.next = 1;
operationalSeed.company.electronicBilling = false;
operationalSeed.company.billingNotice = "Configura el proveedor de facturación electrónica SUNAT antes de emitir comprobantes tributarios desde INGENACC.";
