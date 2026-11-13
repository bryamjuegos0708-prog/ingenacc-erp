import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {randomBytes,randomUUID} from "node:crypto";

const root=fs.mkdtempSync(path.join(os.tmpdir(),"ingenacc-backup-test-"));
process.env.DATABASE_PATH=path.join(root,`${randomUUID()}.db`);
process.env.INGENACC_SEED_MODE="operational";
process.env.JWT_SECRET=randomBytes(48).toString("base64url");
const {createAutomaticBackup}=await import("./automatic-backup.js");
const {closeDatabase}=await import("./db/database.js");

test("el respaldo automático se relee, verifica y aplica retención",()=>{
 try{
  const directory=path.join(root,"network-copy");
  const first=createAutomaticBackup({directory,now:new Date("2026-11-11T18:00:00Z"),retention:1});
  assert.equal(first.lastError,null);assert.equal(first.lastHash.length,64);assert.ok(first.lastBytes>100);assert.ok(fs.existsSync(path.join(directory,first.lastFile)));
  const second=createAutomaticBackup({directory,now:new Date("2026-11-12T18:00:00Z"),retention:1});
  assert.ok(fs.existsSync(path.join(directory,second.lastFile)));assert.equal(fs.readdirSync(directory).filter((name)=>name.endsWith(".db")).length,1);
 }finally{closeDatabase();fs.rmSync(root,{recursive:true,force:true});}
});
