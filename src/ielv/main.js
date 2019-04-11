import dotenv from 'dotenv';

import { log } from '../util/logger';
import { triggerFetchDetails } from '../api/triggers';
import getAllProperties from './getAllProperties';

dotenv.config();

export default function(req, res) {
  if (req.header('Authorization') !== process.env.MY_VR_API_KEY) {
    const reason = 'Invalid Authorization header';
    // HTTP Response for incoming request
    res.send({ status: 401, status_message: 'Unauthorized', message: reason });

    // Promise response for function invocation
    return Promise.reject(new Error(reason));
  }

  // Promise response for function invocation
  return getAllProperties()
    .then(xs => xs.slice(0, 2))
    .then(properties => {
      res.send({
        status: 200,
        status_message: 'OK',
        message: 'All properties fetched. Updates initialized.',
      });

      const propertyKeys = properties.map(({ id: [ielvId] }) => ielvId);
      // TODO: Parameterize this callbackURL, such that it will initialize rate updates or calendar updates or all propertyDetails
      triggerFetchDetails(propertyKeys, '/ielvUpdateProperty');
    })
    .catch(log.error);
}
