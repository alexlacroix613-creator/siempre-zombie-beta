import {createHmac,randomUUID,timingSafeEqual,createHash} from 'node:crypto';
export const RULES='courtyard-waves-v1';
const MAX_RUN_MS=12*60*60*1000;
export function failure(message,status=422,code='INVALID_INPUT'){return Object.assign(new Error(message),{status,code});}
export function instagramHandle(value){
  const handle=String(value??'').trim().replace(/^@/,'').toLowerCase();
  if(!/^[a-z0-9_]+(?:\.[a-z0-9_]+)*$/.test(handle)||handle.length>30)throw failure('Enter a valid Instagram handle.');
  return handle;
}
export function createScoreService({storage,secret,season='beta-20261028',now=Date.now}){
  if(!/^[a-z0-9-]{1,60}$/.test(season))throw new Error('Invalid leaderboard season');
  const path=`siempre-zombie/seasons/${season}/leaderboard.json`;
  const key=()=>{if(!secret||secret.length<32)throw failure('The leaderboard is temporarily unavailable.',503,'UNAVAILABLE');return secret;};
  const signature=text=>createHmac('sha256',key()).update(text).digest('base64url');
  function start({name,rulesVersion}){
    if(rulesVersion!==RULES)throw failure('Reload the game to use the current rules.');
    const payload={id:randomUUID(),handle:instagramHandle(name),season,startedAt:now()};
    const body=Buffer.from(JSON.stringify(payload)).toString('base64url');
    return{scope:'shared',season,runId:body+'.'+signature(body)};
  }
  function decode(token){
    if(typeof token!=='string'||token.length>800)throw failure('This run could not be verified.');
    const [body,sig,extra]=token.split('.'),expected=signature(body||'');
    if(extra||!sig||sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))throw failure('This run could not be verified.');
    let run;try{run=JSON.parse(Buffer.from(body,'base64url').toString());}catch{throw failure('Invalid run.');}
    if(run.season!==season||!Number.isFinite(run.startedAt)||run.startedAt>now()+1000||now()-run.startedAt>MAX_RUN_MS)throw failure('This run has expired. Start a new game.');
    return run;
  }
  const sort=rows=>rows.sort((a,b)=>b.bestScore-a.bestScore||b.bestWave-a.bestWave||a.achievedAt-b.achievedAt||a.handle.localeCompare(b.handle));
  function board(state,name){
    const rows=sort([...state.players]).map((row,index)=>({...row,rank:index+1,displayName:'@'+row.handle}));
    let handle;try{handle=instagramHandle(name);}catch{}
    return{scope:'shared',season,entries:rows.slice(0,10),player:rows.find(r=>r.handle===handle)||null,totalPlayers:rows.length};
  }
  async function read(){
    const current=await storage.read(path);
    if(!current)return{state:{season,players:[],processed:{}},etag:null};
    if(current.state.season!==season||!Array.isArray(current.state.players)||!current.state.processed)throw failure('The leaderboard is temporarily unavailable.',503,'UNAVAILABLE');
    return current;
  }
  async function submit(input){
    const run=decode(input.runId),handle=instagramHandle(input.name),elapsed=now()-run.startedAt;
    if(handle!==run.handle||input.rulesVersion!==RULES)throw failure('This score does not match its run.');
    const metrics={};
    for(const k of ['score','wave','kills','headshots','durationMs']){const v=input[k];if(!Number.isSafeInteger(v)||v<0)throw failure('Invalid score statistics.');metrics[k]=v;}
    const {score,wave,kills,headshots,durationMs}=metrics;
    if(wave<1||durationMs<1000||durationMs>elapsed+10000||durationMs>MAX_RUN_MS||headshots>kills||kills>Math.ceil(elapsed/1000*20)+50||wave>Math.ceil(elapsed/2000)+1||score>950*kills+125*wave*(wave+1))throw failure('This score could not be validated.');
    const digest=createHash('sha256').update(JSON.stringify(metrics)).digest('hex');
    for(let attempt=0;attempt<6;attempt++){
      const {state,etag}=await read(),prior=state.processed[run.id];
      if(prior){if(prior.digest!==digest)throw failure('This run has already been submitted.',409,'ALREADY_SUBMITTED');return{...board(state,handle),rank:board(state,handle).player?.rank,newBest:false};}
      const previous=state.players.find(p=>p.handle===handle),newBest=!previous||score>previous.bestScore||(score===previous.bestScore&&wave>previous.bestWave);
      if(newBest){state.players=state.players.filter(p=>p.handle!==handle);state.players.push({handle,bestScore:score,bestWave:wave,kills,headshots,achievedAt:now(),verified:false,avatarUrl:null});}
      for(const [id,item] of Object.entries(state.processed))if(now()-item.at>MAX_RUN_MS)delete state.processed[id];
      state.processed[run.id]={at:now(),digest};
      try{await storage.write(path,state,etag);const ranked=board(state,handle);return{...ranked,rank:ranked.player?.rank,newBest};}
      catch(error){if(!storage.isConflict(error))throw error;}
    }
    throw failure('Scores are busy. Please try again.',503,'BUSY');
  }
  return{start,submit,leaderboard:async name=>board((await read()).state,name),season,path};
}
