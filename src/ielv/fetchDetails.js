import { log } from '../util/logger';
import { triggerFetchDetails } from '../api/triggers';

import getAllProperties from './getAllProperties';
import getPropertyDetails from './getPropertyDetails';
import { gcpClient } from '../api/client';

const logComplete = (res, message) => {
  log.noTest(message);

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

  // TODO: Remove after done debugging
  log.noTest(req.body);

  // Catch invalid arg before destructuring
  if (req.body.propertyKeys === undefined) {
    log.noTest('No property keys provided. Restarting...');

    return getAllProperties()
      .then(properties => {
        res.send({
          status: 200,
          status_message: 'OK',
          message: 'All properties fetched. Updates initialized.',
        });

        // Restart from the end of the list
        const propertyKeys = properties.map(({ id: [ielvId] }) => ielvId);
        triggerFetchDetails(
          propertyKeys.reverse(),
          req.body.callbackURL || '/ielvUpdateAvailability'
        );
      })
      .catch(err => {
        log.error(err);
        res.status(500).send('Update error - check logs for details');
      });
  }

  // TODO: Remove after debugging
  log.noTest(req.body);

  const {
    propertyKeys: [propertyKey, ...otherPropertyKeys],
    callbackURL,
  } = req.body;

  log.noTest(`IELV_${propertyKey} - Fetching Details`);

  return propertyKey === undefined
    ? logComplete(res, 'All updates complete...')
    : getPropertyDetails(propertyKey)
        .then(propertyDetails => {
          const message = `IELV_${propertyKey} - Details Fetched`;
          log.noTest(message);
          res.send({
            status: 200,
            status_message: 'OK',
            message,
          });

          return gcpClient.post(callbackURL, {
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
