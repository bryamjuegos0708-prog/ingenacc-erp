import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createDatabaseBackup } from "./store.js";

const moduleDirectory=path.dirname(fileURLToPath(import.meta.url));
const defaultDirectory=path.resolve(moduleDirectory,"../backups");
let state={enabled:process.env.AUTOMATIC_BACKUPS_ENABLED!=="false",configured:Boolean(process.env.BACKUP_DIR),directory:process.env.BACKUP_DIR||defaultDirectory,lastSuccess:null,lastFile:null,lastBytes:0,lastHash:null,lastError:null};
const stamp=(date)=>date.toISOString().replace(/[:.]/g,"-");
const hash=(buffer)=>createHash("sha256").update(buffer).digest("hex");

export function automaticBackupStatus(){return {...state};}

export function createAutomaticBackup({directory=process.env.BACKUP_DIR||defaultDirectory,now=new Date(),retention=Number(process.env.BACKUP_RETENTION||30)}={}){
  state={...state,enabled:true,configured:Boolean(process.env.BACKUP_DIR),directory,lastError:null};
  try{
    fs.mkdirSync(directory,{recursive:true});
    const backup=createDatabaseBackup();
    if(!Buffer.isBuffer(backup)||backup.length<100||backup.subarray(0,15).toString()!=="SQLite format 3")throw new Error("La base generada no tiene un formato SQLite válido.");
    const filename=`ingenacc-auto-${stamp(now)}.db`,target=path.join(directory,filename),temporary=`${target}.tmp`;
    fs.writeFileSync(temporary,backup,{flag:"wx"});fs.renameSync(temporary,target);
    const stored=fs.readFileSync(target),sourceHash=hash(backup),storedHash=hash(stored);
    if(stored.length!==backup.length||storedHash!==sourceHash){fs.rmSync(target,{force:true});throw new Error("La copia guardada no coincide con la base original.");}
    const files=fs.readdirSync(directory).filter((name)=>/^ingenacc-auto-.*\.db$/.test(name)).map((name)=>({name,time:fs.statSync(path.join(directory,name)).mtimeMs})).sort((a,b)=>b.time-a.time);
    for(const old of files.slice(Math.max(1,retention)))fs.rmSync(path.join(directory,old.name),{force:true});
    state={...state,lastSuccess:now.toISOString(),lastFile:filename,lastBytes:stored.length,lastHash:storedHash,lastError:null};
    return automaticBackupStatus();
  }catch(error){state={...state,lastError:error instanceof Error?error.message:"No se pudo crear el respaldo automático."};throw error;}
}

export function startAutomaticBackups(){
  if(process.env.AUTOMATIC_BACKUPS_ENABLED==="false"){state={...state,enabled:false};return null;}
  const run=()=>{try{createAutomaticBackup();console.log(`Respaldo automático verificado: ${state.lastFile}`);}catch(error){console.error(`Respaldo automático falló: ${error instanceof Error?error.message:error}`);}};
  run();const timer=setInterval(run,24*60*60*1000);timer.unref();return timer;
}
