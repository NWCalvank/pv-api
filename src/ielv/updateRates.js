import { myVRClient } from '../api/client';
import { log } from '../util/logger';
import { triggerFetchDetails } from '../api/triggers';
import { promiseSerial } from '../util/fp';

const NOT_FOUND = 'Not Found';
const MY_CALLBACK_URL = '/ielvUpdateRates';

const seasonalMinimum = str => {
  const mapping = {
    low: 5,
    high: 7,
    holiday: 14,
  };
  let key = 'holiday';
  if (str.toLowerCase().includes('low')) key = 'low';
  if (str.toLowerCase().includes('high')) key = 'high';

  return mapping[key];
};

const sortRates = prices =>
  prices.price
    .reduce(
      (acc, { bedroom_count: bedroomCount }) => [
        ...acc,
        ...bedroomCount.map(
          ({ _: priceString }) =>
            Number(priceString.replace(/\$\s/, '').replace(',', '')) * 100
        ),
      ],
      []
    )
    .sort((a, b) => a - b);

export const syncRates = async (externalId, ielvPrices) => {
  // GET existing rates
  const existingRates = await myVRClient
    .get(`/rates/?property=${externalId}`)
    .then(({ data }) => data)
    .then(({ results }) => results)
    .catch(({ response }) => (response.status === 404 ? NOT_FOUND : response));

  // DELETE existing rates
  await promiseSerial(
    existingRates.map(({ key }) => () => myVRClient.delete(`/rates/${key}/`))
  ).catch(({ response }) => (response.status === 404 ? NOT_FOUND : response));

  const [lowestRate] = sortRates(ielvPrices);

  // POST base rate
  myVRClient
    .post(`/rates/`, {
      // required
      property: externalId,
      // relevant payload
      baseRate: true,
      minStay: 5,
      repeat: false,
      nightly: Math.round(lowestRate / 7),
      weekendNight: Math.round(lowestRate / 7),
    })
    .catch(log.error);

  // POST all current rates
  return promiseSerial(
    ielvPrices.price.map(({ $, bedroom_count: bedroomCount }) => () => {
      const { name: priceName, to: endDate, from: startDate } = $;
      const { _: priceString } = bedroomCount[bedroomCount.length - 1];
      const amountInCents =
        Number(priceString.replace(/\$\s/, '').replace(',', '')) * 100;

      return myVRClient
        .post(`/rates/`, {
          // required
          property: externalId,
          // relevant payload
          baseRate: false,
          name: priceName,
          startDate,
          endDate,
          minStay: seasonalMinimum(priceName),
          repeat: false,
          nightly: Math.round(amountInCents / 7),
          weekendNight: Math.round(amountInCents / 7),
        })
        .catch(log.error);
    })
  );
};

export default function(req, res) {
  if (req.header('Authorization') !== process.env.MY_VR_API_KEY) {
    const reason = 'Invalid Authorization header';
    res.send({ status: 401, status_message: 'Unauthorized', message: reason });

    return Promise.reject(new Error(reason));
  }

  const { propertyDetails, propertyKeys } = req.body;
  const {
    id: [ielvId],
    prices: [ielvPrices],
  } = propertyDetails;
  const externalId = `IELV_${ielvId}`;

  return syncRates(externalId, ielvPrices)
    .then(() => {
      res.send({
        status: 200,
        status_message: 'OK',
        message: `${externalId} - Rates Updated`,
      });

      // TODO: Put this in a trailing .then() and test it
      if (propertyKeys) {
        triggerFetchDetails(propertyKeys, MY_CALLBACK_URL);
      }
    })
    .catch(err => {
      log.error(err);
      if (propertyKeys) {
        triggerFetchDetails(propertyKeys, MY_CALLBACK_URL);
      }

      res.send({ status: 400 });
    });
}
