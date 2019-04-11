import { log } from '../util/logger';
import { triggerFetchDetails } from '../api/triggers';

import getPropertyDetails from './getPropertyDetails';
import { gcpClient } from '../api/client';

const logComplete = (res, message) => {
  log.error(message);

  res.send({
    status: 200,
    status_message: 'OK',
    message,
  });

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

  const {
    propertyKeys: [propertyKey, ...otherPropertyKeys],
    callbackURL,
  } = req.body;

  return propertyKey === undefined
    ? logComplete(res, 'All updates complete...')
    : getPropertyDetails(propertyKey)
        .then(propertyDetails => {
          res.send({
            status: 200,
            status_message: 'OK',
            message: `IELV_${propertyKey} - Details Fetched`,
          });

          gcpClient.post(callbackURL, {
            propertyDetails,
            propertyKeys: otherPropertyKeys,
          });
        })

        .catch(err => {
          log.error(err);
          res.send({ status: 400 });

          // Try next property
          triggerFetchDetails(otherPropertyKeys, callbackURL);
        });
}
