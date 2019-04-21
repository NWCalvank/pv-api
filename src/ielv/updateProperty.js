import path from 'path';

import { myVRClient } from '../api/client';
import { log } from '../util/logger';
import {
  triggerFetchDetails,
  triggerUpdateAvailability,
  triggerUpdateRates,
} from '../api/triggers';
import { promiseSerial, or } from '../util/fp';
import amenitiesList from './amenities';
import { NOT_FOUND } from '../globals';
import buildDescription from './buildDescription';

const MY_CALLBACK_URL = '/ielvUpdateProperty';

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

export const getExistingGroups = externalId =>
  myVRClient
    .get(`/property-memberships/?property=${externalId}`)
    .then(({ data }) => data)
    .catch(log.error);

export const addToGroup = (externalId, group) =>
  myVRClient
    .post(`/property-memberships/`, {
      group,
      property: externalId,
    })
    .then(({ data }) => data)
    .catch(({ response }) => (response.status === 404 ? NOT_FOUND : response));

export const conditionallyAddToGroup = async externalId => {
  const existingGroups = await getExistingGroups(externalId);

  const existingGroupKeys = existingGroups.results.map(({ key }) => key);

  return Promise.all(
    [process.env.MY_VR_GROUP_KEY_1, process.env.MY_VR_GROUP_KEY_2].map(
      group =>
        existingGroupKeys.includes(group)
          ? Promise.resolve()
          : addToGroup(externalId, group)
    )
  );
};

export const getExistingBedrooms = externalId =>
  myVRClient
    .get(`/rooms/?property=${externalId}`)
    .then(({ data }) => data)
    .then(({ results }) => results.filter(({ type }) => type === 'bedroom'))
    .catch(log.error);

export const createMyVRRoom = externalId => ({
  bed_size: [bedSize] = [''],
}) => () =>
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
  return promiseSerial(ielvBedrooms.map(createMyVRRoom(externalId))).catch(
    log.error
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
    .get(`/photos/?property=${externalId}&limit=200`)
    .then(({ data }) => data)
    .catch(log.error);

  // Normalize filenames
  const parseFilename = _path => {
    const filename = path.parse(_path).name;
    return filename ? filename.toLowerCase().replace(/-/g, '_') : '';
  };

  // Extract existing photo filename
  const existingFilenames = existingPhotos.results.map(({ downloadUrl }) =>
    parseFilename(downloadUrl)
  );

  // Handle incremented filenames (ie. foo.jpg, foo1.jpg)
  const incrementedMatch = sourceUrl =>
    existingFilenames
      .map(name => name.includes(parseFilename(sourceUrl)))
      .reduce(or, false);

  // Add New Photos
  return promiseSerial(
    ielvPhotos.photo.map(({ _: sourceUrl }) => () =>
      existingFilenames.includes(sourceUrl) || incrementedMatch(sourceUrl)
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

const setAmenities = async externalId => {
  const existingAmenities = await myVRClient
    .get(`/property-amenities/?property=${externalId}&limit=100`)
    .then(({ data }) => data)
    .then(({ results }) => results.map(({ amenity: { key } }) => key))
    .catch(log.error);

  const amenitiesToUpdate = amenitiesList
    .map(({ key }) => key)
    .filter(key => !existingAmenities.includes(key));

  const applicativeRequests = amenitiesToUpdate.map(amenityKey => () =>
    myVRClient
      .post(`/property-amenities/`, {
        property: externalId,
        amenity: amenityKey,
        count: 1,
      })
      .catch(log.error)
  );

  return promiseSerial(applicativeRequests).catch(log.error);
};

export const updateProperty = async ({
  id: [ielvId],
  title: [name],
  description: [ielvDescription],
  bathrooms: [ielvBathrooms],
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
  const getRoomType = roomType =>
    ielvRooms.filter(({ $: { type } }) =>
      type.toLowerCase().includes(roomType.toLowerCase())
    );
  const [ielvBedrooms, ielvKitchen, ielvLivingRoom] = [
    'Bedroom',
    'Kitchen',
    'Living',
  ].map(getRoomType);

  // GET property current details
  const property = await getProperty(externalId);

  // POST new property or PUT existing
  log.noTest(`creating property ${externalId}`);
  const method = property === NOT_FOUND ? postProperty : putDescription;
  await method({
    name,
    shortCode: `II${ielvId.slice(-3)}`,
    description: buildDescription({
      name,
      description: ielvDescription,
      locations: ielvLocations,
      pools: ielvPools,
      facilities: ielvFacilities,
      services: ielvServices,
      restrictions: ielvRestrictions,
      bedrooms: ielvBedrooms,
      kitchen: ielvKitchen,
      livingRoom: ielvLivingRoom,
    }),
    bathrooms: Number(ielvBathrooms),
    lat: formatLatLon(ielvLatitude) || '17.8987771',
    lon: formatLatLon(ielvLongitude) || '-62.8331287',
    addressOne: name,
    city: ielvLocations[0] && ielvLocations[0].location[0],
    postalCode: '97700',
    countryCode: 'BL',
    accommodates: ielvBedrooms.length * 2,
    externalId,
  });

  // API limitations require that these be sequential
  // Update availability
  log.noTest(`updateCalendarEvents ${externalId}`);
  await triggerUpdateAvailability()({
    id: [ielvId],
    availability: [ielvAvailability],
  });

  // Add Property to Group if needed
  log.noTest(`conditionallyAddToGroup ${externalId}`);
  await conditionallyAddToGroup(externalId);

  // POST new bedrooms
  log.noTest(`postBedrooms ${externalId}`);
  await postBedrooms(externalId, ielvRooms);

  // Sync rates
  log.noTest(`syncRates ${externalId}`);
  await triggerUpdateRates()({
    id: [ielvId],
    prices: [ielvPrices],
  });

  // Set standard fees
  log.noTest(`setFees ${externalId}`);
  await setFees(externalId);

  // Add new photos
  log.noTest(`addPhotos ${externalId}`);
  await addPhotos(externalId, ielvPhotos);

  // Set Amenities
  log.noTest(`setAmenities ${externalId}`);
  await setAmenities(externalId);

  log.noTest(`${externalId} - Updates Complete...`);
  return externalId;
};

// Accepts an object of {propertyKeys, propertyDetails} where propertyKeys is
// the list of properties not yet updated
export default function(req, res) {
  if (req.header('Authorization') !== process.env.MY_VR_API_KEY) {
    const reason = 'Invalid Authorization header';
    res.status(401).send(reason);

    return Promise.reject(new Error(reason));
  }

  const { propertyDetails, propertyKeys } = req.body;

  // Promise response for function invocation
  return updateProperty(propertyDetails)
    .then(externalId => {
      res.send({
        status: 200,
        status_message: 'OK',
        message: `${externalId} - Property Updated`,
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
