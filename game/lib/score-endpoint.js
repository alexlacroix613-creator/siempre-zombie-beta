import {createScoreService,failure} from './score-service.js';
import {createNeonStorage} from './neon-storage.js';
import {LEADERBOARD_SEASON} from '../leaderboard-config.js';
export const scores=createScoreService({storage:createNeonStorage(process.env.ZOMBIE_DATABASE_URL),secret:process.env.ZOMBIE_RUN_SIGNING_KEY,season:LEADERBOARD_SEASON});
export function endpoint(method,work){return async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control',method==='GET'?'public, max-age=0, s-maxage=30':'no-store');
  if(req.method!==method){res.setHeader('Allow',method);return res.status(405).json({scope:'shared',error:{code:'METHOD_NOT_ALLOWED',message:'Method not allowed.'}});}
  try{
    if(method==='POST'&&!String(req.headers['content-type']||'').startsWith('application/json'))throw failure('Send JSON.',415);
    if(method==='POST'&&Number(req.headers['content-length']||0)>4096)throw failure('Request too large.',413);
    return res.status(200).json(await work(req));
  }catch(error){
    res.setHeader('Cache-Control','no-store');
    return res.status(error.status||503).json({scope:'shared',error:{code:error.code||'UNAVAILABLE',message:error.status?error.message:'The leaderboard is temporarily unavailable.'}});
  }
};}
