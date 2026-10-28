// Run only through `vercel env run` for the existing Siempre site.
// Credentials stay in the consuming processes and provider-managed encrypted env.
import pg from '../game/node_modules/pg/lib/index.js';
import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createNeonStorage} from '../game/lib/neon-storage.js';
import {createScoreService,RULES} from '../game/lib/score-service.js';
const envTool=fileURLToPath(new URL('./beta-score-env.py',import.meta.url));
const setting=(key,value)=>JSON.parse(execFileSync('python',[envTool,key],{input:value,encoding:'utf8',stdio:['pipe','pipe','pipe']}));
const status=setting('--status','');
if(status.configured.length){console.log(JSON.stringify({stopped:true,reason:'Zombie settings already exist; no credentials changed.'}));process.exit(1);}
const base=new URL(process.env.DATABASE_URL_UNPOOLED||process.env.DATABASE_URL);base.searchParams.set('sslmode','verify-full');
const owner=new pg.Pool({connectionString:base.toString(),max:1,connectionTimeoutMillis:10000,statement_timeout:10000,application_name:'siempre-zombie-provision'});owner.on('error',()=>{});
let transaction=false,runtime,storageA,storageB;
const createdKeys=[];
try{
 const check=await owner.query("select exists(select 1 from pg_namespace where nspname='siempre_zombie') or exists(select 1 from pg_roles where rolname='siempre_zombie_runtime') as occupied");
 if(check.rows[0].occupied)throw new Error('Existing namespace requires inspection');
 const password=randomBytes(32).toString('hex'),secret=randomBytes(48).toString('hex');
 const runtimeUrl=new URL(base);runtimeUrl.username='siempre_zombie_runtime';runtimeUrl.password=password;
 await owner.query('BEGIN');transaction=true;
 await owner.query(`CREATE ROLE siempre_zombie_runtime LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 4 PASSWORD '${password}'`);
 await owner.query(await readFile(new URL('./zombie-score-schema.sql',import.meta.url),'utf8'));
 for(const [key,value] of [['ZOMBIE_DATABASE_URL',runtimeUrl.toString()],['ZOMBIE_RUN_SIGNING_KEY',secret]]){if(!setting(key,value).stored)throw new Error('Provider configuration incomplete');createdKeys.push(key);}
 await owner.query('COMMIT');transaction=false;
 runtime=new pg.Pool({connectionString:runtimeUrl.toString(),max:1,connectionTimeoutMillis:10000,statement_timeout:10000});runtime.on('error',()=>{});
 const {rows:[priv]}=await runtime.query("select exists(select 1 from pg_namespace n where n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg_%' and has_schema_privilege(current_user,n.oid,'CREATE')) as schema_create, (select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p') and n.nspname not in ('pg_catalog','information_schema','siempre_zombie') and n.nspname not like 'pg_%' and has_table_privilege(current_user,c.oid,'SELECT,INSERT,UPDATE,DELETE') and not exists(select 1 from pg_depend d where d.objid=c.oid and d.deptype='e')) as other_table_access");
 if(priv.schema_create||priv.other_table_access)throw new Error('Runtime role isolation check failed');
 storageA=createNeonStorage(runtimeUrl.toString());storageB=createNeonStorage(runtimeUrl.toString());
 let time=Date.now();const now=()=>time,season='verification-'+Date.now();
 const a=createScoreService({storage:storageA,secret,season,now}),b=createScoreService({storage:storageB,secret,season,now});
 const first=a.start({name:'storage_check_a',rulesVersion:RULES}),second=b.start({name:'storage_check_b',rulesVersion:RULES});time+=60000;
 const result=(run,name,score)=>({runId:run.runId,name,rulesVersion:RULES,score,wave:1,kills:5,headshots:0,durationMs:60000});
 await Promise.all([a.submit(result(first,'storage_check_a',500)),b.submit(result(second,'storage_check_b',750))]);
 const board=await b.leaderboard('storage_check_a');
 if(board.entries.length!==2||board.entries[0].bestScore!==750)throw new Error('Persistence check failed');
 const launch=createScoreService({storage:storageA,secret,season:'verification-launch-'+Date.now(),now});
 if((await launch.leaderboard('storage_check_a')).entries.length)throw new Error('Season isolation failed');
 // Disposable verification namespace only; never inserts fake scores into the beta.
 await owner.query('delete from siempre_zombie.leaderboard_states where path=$1',[a.path]);
 console.log(JSON.stringify({provisioned:true,existingResource:'cantina-tequila-maker',newStore:false,newSubscription:false,runtimeIsolated:true,independentClients:true,concurrentScores:true,launchEmpty:true,betaScoresInserted:0,verificationCleaned:true}));
}catch(error){
 let rollbackClean=true;
 if(transaction){
  await owner.query('ROLLBACK').catch(()=>{rollbackClean=false;});
  // Undo only new values successfully created by this transaction. Preexisting settings cause an early stop.
  for(const key of createdKeys.reverse())try{const r=JSON.parse(execFileSync('python',[envTool,'--rollback-created',key],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));if(!r.rolledBack)rollbackClean=false;}catch{rollbackClean=false;}
 }
 console.log(JSON.stringify({provisioned:false,error:'Setup or verification failed; details withheld.',code:typeof error.code==='string'?error.code:null,rollbackClean,committed:!transaction}));process.exitCode=1;
}
finally{await Promise.allSettled([owner.end(),runtime?.end(),storageA?.close(),storageB?.close()]);}
