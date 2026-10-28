import {scores,endpoint} from '../../lib/score-endpoint.js';
export default endpoint('POST',req=>scores.submit(req.body||{}));
