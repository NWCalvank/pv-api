import { myVRClient } from '../api/client';
import { logError } from '../util/logger';

export const NOT_FOUND = 'Not Found';

export const seasonalMinimum = str => {
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

const htmlStyle = (items, title) => `
<br/>

<div><strong>${title}</strong></div>
<div>
<ul><li>
${items
  .map(obj => obj[title.toLowerCase()].join('</li><li>'))
  .join('</li><li>')}
</li></ul>
</div>
`;

export const buildDescription = ({
  description,
  locations,
  pools,
  facilities,
  services,
  restrictions,
  rooms,
}) => `
<div><strong>Summary</strong></div>
<div>${description}</div>
${htmlStyle(locations, 'Location')}
${htmlStyle(facilities, 'Facility')}
${htmlStyle(services, 'Service')}
${htmlStyle(restrictions, 'Restriction')}

<br/>

<div><strong>Pools</strong></div>
<div>
<ul><li>
${pools[0].pool.map(({ description: [text] }) => text).join('</li><li>')}
</li></ul>
</div>

<br />

<div>
${rooms
  .map(room =>
    Object.entries(room)
      .map(
        ([key, value]) =>
          key === '$'
            ? `<div><strong>${value.type} ${
                value.index === '1' ? '' : value.index
              }</strong></div><ul>`
            : `<li>${key}: ${value[0]}</li>`
      )
      .join('')
  )
  .join('</ul></div><br/><div>')}
<div>
`;

export const getProperty = externalId =>
  myVRClient
    .get(`/properties/${externalId}/`)
    .then(({ data }) => data)
    .catch(
      ({ response: { status } }) => (status === 404 ? NOT_FOUND : 'Other error')
    );

export const putDescription = ({
  name,
  description,
  accommodates,
  externalId,
}) =>
  myVRClient
    .put(`/properties/${externalId}/`, {
      // required
      name,
      // relevant payload
      description,
      accommodates,
      // becomes null if not set explicitly
      externalId,
    })
    .then(({ data }) => data)
    .catch(
      // TODO: Improve this error message
      ({ response: { status } }) =>
        status === 404 ? NOT_FOUND : `Status: ${status}`
    );

export const postProperty = ({ name, description, accommodates, externalId }) =>
  myVRClient
    .post(`/properties/`, {
      // required
      name,
      // relevant payload
      description,
      accommodates,
      // becomes null if not set explicitly
      externalId,
    })
    .then(({ data }) => data)
    .catch(
      // TODO: Improve this error message
      ({ response: { status } }) =>
        status === 404 ? NOT_FOUND : `Status: ${status}`
    );

export const getExistingBedrooms = externalId =>
  myVRClient
    .get(`/rooms/?property=${externalId}`)
    .then(({ data }) => data)
    .then(({ results }) => results.filter(({ type }) => type === 'bedroom'))
    .catch(logError);

export const parseBedSize = rawBedSize => {
  const bedSize = rawBedSize.toLowerCase();
  if (bedSize.includes('king')) {
    return 'king';
  }

  if (bedSize.includes('full')) {
    return 'full';
  }

  if (bedSize.includes('queen')) {
    return 'queen';
  }

  if (bedSize.includes('twin')) {
    return 'twin';
  }

  if (bedSize.includes('crib')) {
    return 'crib';
  }

  return 'other';
};

export const sortRates = prices =>
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

export const createMyVRRoom = externalId => ({ bed_size: [bedSize] }) =>
  myVRClient
    .post(`/rooms/`, {
      // required
      property: externalId,
      // data to update
      beds: [
        {
          size: parseBedSize(bedSize),
          type: 'standard',
          mattress: 'box',
        },
      ],
    })
    .then(({ data }) => data)
    .catch(logError);

export const postBedrooms = async (externalId, ielvRooms) => {
  // Check existing bedrooms
  const existingMyVRBedrooms = await getExistingBedrooms(externalId);

  const ielvBedrooms = ielvRooms.filter(
    ({ $: { type } }) => type === 'Bedroom'
  );

  // Remove all existing MyVR rooms for current property
  await existingMyVRBedrooms.map(({ key }) =>
    myVRClient.delete(`/rooms/${key}/`).catch(logError)
  );

  // Create all rooms from IELV Data
  return Promise.all(ielvBedrooms.map(createMyVRRoom(externalId)));
};

export const syncRates = async (externalId, ielvPrices) => {
  // GET existing rates
  const existingRates = await myVRClient
    .get(`/rates/?property=${externalId}`)
    .then(({ data }) => data)
    .then(({ results }) => results)
    .catch(
      ({ response: { status } }) => (status === 404 ? NOT_FOUND : 'Other error')
    );

  // DELETE existing rates
  await Promise.all(
    existingRates.map(async ({ key }) => myVRClient.delete(`/rates/${key}/`))
  ).catch(
    ({ response: { status } }) => (status === 404 ? NOT_FOUND : 'Other error')
  );

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
      nightly: lowestRate,
      weekendNight: lowestRate,
    })
    .catch(logError);

  // POST all current rates
  return Promise.all(
    ielvPrices.price.map(async ({ $, bedroom_count: bedroomCount }) => {
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
          nightly: amountInCents,
          weekendNight: amountInCents,
        })
        .catch(logError);
    })
  );
};

const setFees = async externalId => {
  const existingFees = await myVRClient
    .get(`/fees/?property=${externalId}`)
    .then(({ data }) => data)
    .then(({ results }) => results)
    .catch(logError);

  const TAX = 'Tax';
  const SERVICE_CHARGE = 'Service Charge';

  if (!existingFees) {
    return Promise.reject(
      new Error(`Failed to fetch existing fees for property ${externalId}`)
    );
  }

  const existingTax = existingFees.filter(({ name }) => name === TAX)[0];
  const existingServiceCharge = existingFees.filter(
    ({ name }) => name === SERVICE_CHARGE
  )[0];

  const taxPayload = {
    // required
    property: externalId,
    // relevant payload
    name: TAX,
    type: 'tax',
    basis: 'rent-percentage',
    currency: 'USD',
    percentage: '5.000',
    included: true,
    optional: false,
    refundable: false,
    taxable: false,
    position: 1,
    guestThreshold: 0,
    includeChildren: false,
    locked: false,
  };

  const serviceChargePayload = {
    // required
    property: externalId,
    // relevant payload
    name: SERVICE_CHARGE,
    type: 'fee',
    basis: 'rent-percentage',
    currency: 'USD',
    percentage: '10.000',
    included: true,
    optional: false,
    refundable: false,
    taxable: true,
    position: 0,
    guestThreshold: 0,
    includeChildren: false,
    locked: false,
  };

  const taxPromise = existingTax
    ? myVRClient.put(`/fees/${existingTax.key}/`, taxPayload)
    : myVRClient.post(`/fees/`, taxPayload);

  const serviceChargePromise = existingServiceCharge
    ? myVRClient.put(
        `/fees/${existingServiceCharge.key}/`,
        serviceChargePayload
      )
    : myVRClient.post(`/fees/`, serviceChargePayload);

  return Promise.all([taxPromise, serviceChargePromise]).catch(logError);
};

export default async ({
  id: [ielvId],
  title: [name],
  description: [ielvDescription],
  locations: ielvLocations,
  pools: ielvPools,
  facilities: ielvFacilities,
  services: ielvServices,
  restrictions: ielvRestrictions,
  rooms: [{ room: ielvRooms }],
  prices: [ielvPrices],
}) => {
  const externalId = `IELV_${ielvId}`;
  const ielvBedrooms = ielvRooms.filter(
    ({ $: { type } }) => type === 'Bedroom'
  );

  // GET property current details
  const property = await getProperty(externalId);

  // POST new property or PUT existing
  const method = property === NOT_FOUND ? postProperty : putDescription;
  // TODO: Add shortcode
  await method({
    name,
    description: buildDescription({
      description: ielvDescription,
      locations: ielvLocations,
      pools: ielvPools,
      facilities: ielvFacilities,
      services: ielvServices,
      restrictions: ielvRestrictions,
      rooms: ielvRooms,
    }),
    accommodates: ielvBedrooms.length * 2,
    externalId,
  });

  // POST new bedrooms
  await postBedrooms(externalId, ielvRooms);

  // Sync rates
  await syncRates(externalId, ielvPrices);

  // Set standard fees
  await setFees(externalId);

  return getProperty(externalId);
};
