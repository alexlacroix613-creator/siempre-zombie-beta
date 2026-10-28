import {scores,endpoint} from '../../lib/score-endpoint.js';
const readLeaderboard=endpoint('GET',req=>scores.leaderboard(req.query.name));
const gamesOrigins=new Set(['https://siempretequila.com','https://www.siempretequila.com']);
export default function leaderboard(req,res){
  // Public scores can be read by the brand's Games page. Writes keep their existing origin rules.
  res.setHeader('Vary','Origin');
  if(gamesOrigins.has(req.headers.origin))res.setHeader('Access-Control-Allow-Origin',req.headers.origin);
  return readLeaderboard(req,res);
}
