import pg from '../game/node_modules/pg/lib/index.js';
const raw=process.env.DATABASE_URL_UNPOOLED||process.env.DATABASE_URL;
if(!raw){console.log(JSON.stringify({configured:false}));process.exit(1);}
const url=new URL(raw);url.searchParams.set('sslmode','verify-full');
const pool=new pg.Pool({connectionString:url.toString(),max:1,connectionTimeoutMillis:10000,statement_timeout:10000,application_name:'siempre-zombie-readiness'});
pool.on('error',()=>{});
try{
 const {rows:[row]}=await pool.query("select has_database_privilege(current_user,current_database(),'CREATE') as can_create_schema, exists(select 1 from pg_namespace where nspname='siempre_zombie') as zombie_schema_exists, exists(select 1 from pg_roles where rolname='siempre_zombie_runtime') as zombie_role_exists");
 console.log(JSON.stringify({connected:true,...row}));
}catch{console.log(JSON.stringify({connected:false,error:'Database readiness check failed; details withheld.'}));process.exitCode=1;}
finally{await pool.end();}
