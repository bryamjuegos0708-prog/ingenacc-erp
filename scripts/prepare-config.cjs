const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const target = path.join(root, '.env');
let source = fs.existsSync(target) ? fs.readFileSync(target, 'utf8').replace(/^\uFEFF/, '') : '';
const original = source;
const value = key => {
 const lines = source.split(/\r?\n/).filter(line => line.trimStart().startsWith(key + '='));
 return (lines.at(-1) || '').slice((lines.at(-1) || '').indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');
};
function set(key, val) {
 source = source.split(/\r?\n/).filter(line => !line.trimStart().startsWith(key + '=')).join('\n').trimEnd() + '\n' + key + '=' + val + '\n';
}
const defaults = {PORT:'4000', HOST:'0.0.0.0', NODE_ENV:'production', INGENACC_SEED_MODE:'operational', DATABASE_PATH:'./server/data/ingenacc.db', AUTOMATIC_BACKUPS_ENABLED:'true', BACKUP_RETENTION:'30'};
for (const [key,val] of Object.entries(defaults)) if (!value(key)) set(key,val);
if (value('JWT_SECRET').length < 32) set('JWT_SECRET', randomBytes(48).toString('hex'));
if (!value('SETUP_TOKEN')) set('SETUP_TOKEN', randomBytes(24).toString('hex'));
if (source !== original) {
 if (fs.existsSync(target)) fs.copyFileSync(target, target + '.backup-' + Date.now());
 fs.writeFileSync(target, source.trimStart(), {mode:0o600});
}
fs.writeFileSync(path.join(root,'ACCESO-INICIAL.txt'), 'CODIGO DE INSTALACION INGENACC\n\n' + value('SETUP_TOKEN') + '\n\nSolo se solicita al configurar una instalacion nueva.\n', {mode:0o600});
console.log('Configuracion comprobada. Base de datos conservada.');
