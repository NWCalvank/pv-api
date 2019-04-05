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

  // HTTP Response for incoming request
  res.send({
    status: 200,
    status_message: 'OK',
    message: 'Function IELV successfully invoked',
  });

  // Promise response for function invocation
  return getAllProperties()
    .then(xs => xs.slice(0, 3))
    .then(properties => {
      const propertyKeys = properties.map(({ id: [ielvId] }) => ielvId);
      triggerFetchDetails(propertyKeys);
    })
    .catch(log.error);
}
