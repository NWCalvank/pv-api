import { myVRClient } from '../api/client';
import { log } from '../util/logger';
import { triggerFetchDetails } from '../api/triggers';
import { promiseSerial } from '../util/fp';

const MY_CALLBACK_URL = '/ielvUpdateAvailability';

const parseAvailabilityStatus = status =>
  status.toLowerCase() === 'reserved' ? 'reserved' : false;

export const updateCalendarEvents = async (externalId, ielvAvailability) => {
  const EVENT_TITLE = 'IELV';

  const existingCalendarEvents = await myVRClient
    .get(`/calendar-events/?property=${externalId}&limit=200`)
    .then(({ data }) => data)
    .then(({ results }) => results)
    .catch(log.error);

  // Delete existing IELV events
  await promiseSerial(
    existingCalendarEvents
      .filter(({ title }) => title === EVENT_TITLE)
      .map(({ key }) => () =>
        myVRClient.delete(`/calendar-events/${key}/`).catch(log.error)
      )
  ).catch(log.error);

  // Add latest IELV events
  return promiseSerial(
    ielvAvailability.period
      .filter(({ status: [statusString] }) =>
        parseAvailabilityStatus(statusString)
      )
      .map(({ status: [statusString], $: { from, to } }) => () =>
        myVRClient
          .post('/calendar-events/', {
            property: externalId,
            startDate: from,
            endDate: to,
            status: parseAvailabilityStatus(statusString),
            title: EVENT_TITLE,
          })
          .then(({ data }) => data)
          .catch(log.error)
      )
  ).catch(log.error);
};

export default function(req, res) {
  if (req.header('Authorization') !== process.env.MY_VR_API_KEY) {
    const reason = 'Invalid Authorization header';
    res.status(401).send(reason);

    return Promise.reject(new Error(reason));
  }

  const { propertyDetails, propertyKeys } = req.body;
  const {
    id: [ielvId],
    availability: [ielvAvailability],
  } = propertyDetails;
  const externalId = `IELV_${ielvId}`;
  log.noTest(`${externalId} - Availability Update Started`);

  return updateCalendarEvents(externalId, ielvAvailability)
    .then(() => {
      log.noTest(`${externalId} - Availability Updated`);
      res.send({
        status: 200,
        status_message: 'OK',
        message: `${externalId} - Availability Updated`,
      });
    })
    .catch(err => {
      log.error(err);
      res.status(500).send('Update error - check logs for details');
    })
    .then(() => {
      if (propertyKeys) {
        triggerFetchDetails(propertyKeys, MY_CALLBACK_URL);
      }
    });
}
