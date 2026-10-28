import pg from 'pg';
export class ScoreConflict extends Error {}
export function createNeonStorage(connectionString){
  let pool;
  const db=()=>{
    if(!connectionString)throw new Error('Score database unavailable');
    if(!pool){const url=new URL(connectionString);url.searchParams.set('sslmode','verify-full');pool=new pg.Pool({connectionString:url.toString(),max:2,connectionTimeoutMillis:10000,idleTimeoutMillis:5000,statement_timeout:10000,application_name:'siempre-zombie-beta'});pool.on('error',()=>{});}
    return pool;
  };
  return{
    async read(path){const {rows:[row]}=await db().query('select state,version::text as etag from siempre_zombie.leaderboard_states where path=$1',[path]);return row||null;},
    async write(path,state,etag){
      const result=etag
        ?await db().query('update siempre_zombie.leaderboard_states set state=$2::jsonb,version=version+1 where path=$1 and version=$3::bigint returning version',[path,JSON.stringify(state),etag])
        :await db().query('insert into siempre_zombie.leaderboard_states(path,state) values($1,$2::jsonb) on conflict(path) do nothing returning version',[path,JSON.stringify(state)]);
      if(!result.rowCount)throw new ScoreConflict();
    },
    isConflict:error=>error instanceof ScoreConflict,
    close:async()=>{if(pool)await pool.end();},
  };
}
