import {scores,endpoint} from '../../lib/score-endpoint.js';
export default endpoint('GET',req=>scores.leaderboard(req.query.name));
