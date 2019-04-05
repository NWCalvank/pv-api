import { log } from '../util/logger';
import { triggerFetchDetails, triggerUpdateProperty } from '../api/triggers';

import getPropertyDetails from './getPropertyDetails';

const logComplete = message => {
  log.always(message);
  return Promise.resolve();
};

// Accepts a list of property keys. Fetches details for the first one.
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
    message: 'Updating property function successfully invoked',
  });

  const {
    propertyKeys: [propertyKey, ...otherPropertyKeys],
  } = req.body;

  // Promise response for function invocation
  return propertyKey === undefined
    ? logComplete('All updates complete...')
    : getPropertyDetails(propertyKey)
        .then(triggerUpdateProperty(otherPropertyKeys))
        .catch(err => {
          log.error(err);
          // Try next property
          triggerFetchDetails(otherPropertyKeys);
        });
}
