import {scores,endpoint} from '../../lib/score-endpoint.js';
export default endpoint('POST',req=>scores.start(req.body||{}));
