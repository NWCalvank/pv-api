import { myVRClient } from '../api/client';
import { log } from '../util/logger';

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

export const formatLatLon = locationString =>
  locationString
    .split('.')
    .map(str => str.slice(0, 10))
    .join('.')
    .slice(0, 14);

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

export const parseAvailabilityStatus = status =>
  status.toLowerCase() === 'reserved' ? 'reserved' : false;

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
    .catch(({ response }) => (response.status === 404 ? NOT_FOUND : response));

export const putDescription = payload =>
  myVRClient
    .put(`/properties/${payload.externalId}/`, payload)
    .then(({ data }) => data)
    .catch(({ response }) => (response.status === 404 ? NOT_FOUND : response));

export const postProperty = payload =>
  myVRClient
    .post(`/properties/`, payload)
    .then(({ data }) => data)
    .catch(({ response }) => (response.status === 404 ? NOT_FOUND : response));

export const updateCalendarEvents = async (externalId, ielvAvailability) => {
  const EVENT_TITLE = 'IELV';

  const existingCalendarEvents = await myVRClient
    .get(`/calendar-events/?property=${externalId}`)
    .then(({ data }) => data)
    .then(({ results }) => results)
    .catch(log.error);

  // Delete existing IELV events
  await Promise.all(
    existingCalendarEvents
      .filter(({ title }) => title === EVENT_TITLE)
      .map(({ key }) =>
        myVRClient.delete(`/calendar-events/${key}/`).catch(log.error)
      )
  ).catch(log.error);

  // Add latest IELV events
  return Promise.all(
    ielvAvailability.period
      .filter(({ status: [statusString] }) =>
        parseAvailabilityStatus(statusString)
      )
      .map(({ status: [statusString], $: { from, to } }) =>
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

export const getExistingGroups = externalId =>
  myVRClient
    .get(`/property-memberships/?property=${externalId}`)
    .then(({ data }) => data)
    .catch(log.error);

export const addToGroup = externalId =>
  myVRClient
    .post(`/property-memberships/`, {
      group: process.env.MY_VR_GROUP_KEY,
      property: externalId,
    })
    .then(({ data }) => data)
    .catch(({ response }) => (response.status === 404 ? NOT_FOUND : response));

export const conditionallyAddToGroup = async externalId => {
  const existingGroups = await getExistingGroups(externalId);

  const existingGroupKeys = existingGroups.results.map(({ key }) => key);

  return existingGroupKeys.includes(process.env.MY_VR_GROUP_KEY)
    ? Promise.resolve()
    : addToGroup(externalId);
};

export const getExistingBedrooms = externalId =>
  myVRClient
    .get(`/rooms/?property=${externalId}`)
    .then(({ data }) => data)
    .then(({ results }) => results.filter(({ type }) => type === 'bedroom'))
    .catch(log.error);

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
    .catch(log.error);

export const postBedrooms = async (externalId, ielvRooms) => {
  // Check existing bedrooms
  const existingMyVRBedrooms = await getExistingBedrooms(externalId);

  const ielvBedrooms = ielvRooms.filter(
    ({ $: { type } }) => type === 'Bedroom'
  );

  // Remove all existing MyVR rooms for current property
  await existingMyVRBedrooms.map(({ key }) =>
    myVRClient.delete(`/rooms/${key}/`).catch(log.error)
  );

  // Create all rooms from IELV Data
  return Promise.all(ielvBedrooms.map(createMyVRRoom(externalId))).catch(
    log.error
  );
};

export const syncRates = async (externalId, ielvPrices) => {
  // GET existing rates
  const existingRates = await myVRClient
    .get(`/rates/?property=${externalId}`)
    .then(({ data }) => data)
    .then(({ results }) => results)
    .catch(({ response }) => (response.status === 404 ? NOT_FOUND : response));

  // DELETE existing rates
  await Promise.all(
    existingRates.map(async ({ key }) => myVRClient.delete(`/rates/${key}/`))
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
          nightly: Math.round(amountInCents / 7),
          weekendNight: Math.round(amountInCents / 7),
        })
        .catch(log.error);
    })
  );
};

const setFees = async externalId => {
  const existingFees = await myVRClient
    .get(`/fees/?property=${externalId}`)
    .then(({ data }) => data)
    .then(({ results }) => results)
    .catch(log.error);

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

  return Promise.all([taxPromise, serviceChargePromise]).catch(log.error);
};

const addPhotos = async (externalId, ielvPhotos) => {
  // Get existing photos
  const existingPhotos = await myVRClient
    .get(`/photos/?property=${externalId}`)
    .then(({ data }) => data)
    .catch(log.error);

  const parseFilename = path => {
    const filename = path.match(/([^/]+$)/)[0];
    return filename ? filename.toLowerCase().replace(/-/g, '_') : '';
  };

  // Extract existing photo filename
  const existingFilenames = existingPhotos.results.map(({ downloadUrl }) =>
    parseFilename(downloadUrl)
  );

  // Add New Photos
  return Promise.all(
    ielvPhotos.photo.map(
      ({ _: sourceUrl }) =>
        existingFilenames.includes(parseFilename(sourceUrl))
          ? Promise.resolve()
          : myVRClient
              .post('/photos/', {
                property: externalId,
                sourceUrl,
              })
              .catch(log.error)
    )
  ).catch(log.error);
};

export const updateProperty = async ({
  id: [ielvId],
  title: [name],
  description: [ielvDescription],
  availability: [ielvAvailability],
  locations: ielvLocations,
  pools: ielvPools,
  facilities: ielvFacilities,
  services: ielvServices,
  restrictions: ielvRestrictions,
  photos: [ielvPhotos],
  rooms: [{ room: ielvRooms }],
  latitude: [ielvLatitude],
  longitude: [ielvLongitude],
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
  await method({
    name,
    shortCode: `II${ielvId.slice(-3)}`,
    description: buildDescription({
      description: ielvDescription,
      locations: ielvLocations,
      pools: ielvPools,
      facilities: ielvFacilities,
      services: ielvServices,
      restrictions: ielvRestrictions,
      rooms: ielvRooms,
    }),
    lat: formatLatLon(ielvLatitude),
    lon: formatLatLon(ielvLongitude),
    addressOne: name,
    city: ielvLocations[0] && ielvLocations[0].location[0],
    postalCode: '97700',
    countryCode: 'BL',
    accommodates: ielvBedrooms.length * 2,
    externalId,
  });

  // Concurrently send all updates to property record
  await Promise.all([
    // Update availability
    updateCalendarEvents(externalId, ielvAvailability),

    // Add Property to Group if needed
    conditionallyAddToGroup(externalId),

    // POST new bedrooms
    postBedrooms(externalId, ielvRooms),

    // Sync rates
    syncRates(externalId, ielvPrices),

    // Set standard fees
    setFees(externalId),

    // Add new photos
    addPhotos(externalId, ielvPhotos),
  ]);

  log.noTest(`${externalId} - Updates Complete...`);
  return getProperty(externalId);
};

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

  // Promise response for function invocation
  return updateProperty(req.body).catch(log.error);
}
