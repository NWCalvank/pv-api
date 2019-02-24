import fs from 'fs';
import MockAdapter from 'axios-mock-adapter';

import updateProperty, {
  NOT_FOUND,
  buildDescription,
  getProperty,
  putDescription,
  postProperty,
} from '../../src/ielv/updateProperty';
import { myVRClient } from '../../src/api/client';

// Mock JSON Response Data
import ielvProperty from '../mockData/ielv/property.json';
import myVRProperty from '../mockData/myvr/property.json';
import myVRRoom from '../mockData/myvr/room.json';

// Initialize the custom axios instance
const MOCK_PROPERTY_ID = 1234;
const MOCK_PROPERTY_NAME = 'Mock Property';
const MOCK_PROPERTY_EXTERNAL_ID = `IELV_${MOCK_PROPERTY_ID}`;
const expectedHTML = fs.readFileSync(
  `${process.env.PWD}/spec/mockData/myvr/formattedHTML.txt`,
  'utf8'
);

// Resulting Mock Data
const [ielvDescription] = ielvProperty.description;
const ielvLocations = ielvProperty.locations;
const ielvFacilities = ielvProperty.facilities;
const ielvServices = ielvProperty.services;
const ielvRestrictions = ielvProperty.restrictions;
const ielvRooms = ielvProperty.rooms[0].room;
// Updated Details - No Bedrooms
const tmpProperty = { ...myVRProperty, description: ielvDescription };
// Fully-updated Property
const updatedProperty = {
  ...myVRProperty,
  description: ielvDescription,
  bedCount: 1,
  beds: [],
};

describe('updateProperty', () => {
  it('should call the MyVR API with a payload and return the updated property', () => {
    const mockMyVRClient = new MockAdapter(myVRClient);
    mockMyVRClient
      .onGet(`/properties/${MOCK_PROPERTY_EXTERNAL_ID}/`)
      .replyOnce(200, myVRProperty)
      .onPut(`/properties/${MOCK_PROPERTY_EXTERNAL_ID}/`)
      .replyOnce(200, tmpProperty)
      .onPost(`/rooms/`)
      .reply(200, myVRRoom)
      .onGet(`/properties/${MOCK_PROPERTY_EXTERNAL_ID}/`)
      .replyOnce(200, updatedProperty);

    updateProperty(ielvProperty).then(res => {
      expect(res).toEqual(updatedProperty);
    });
  });

  it('should create the property in MyVR if it does not exist', () => {
    const mockMyVRClient = new MockAdapter(myVRClient);
    mockMyVRClient
      .onGet(`/properties/${MOCK_PROPERTY_EXTERNAL_ID}/`)
      .replyOnce(404)
      .onPost(`/properties/`)
      .replyOnce(200, tmpProperty)
      .onPost(`/rooms/`)
      .reply(200, myVRRoom)
      .onGet(`/properties/${MOCK_PROPERTY_EXTERNAL_ID}/`)
      .replyOnce(200, updatedProperty);

    updateProperty(ielvProperty).then(res => {
      expect(res).toEqual(updatedProperty);
    });
  });
});

describe('getProperty', () => {
  it('should call the MyVR API and return the matching property', () => {
    const mockMyVRClient = new MockAdapter(myVRClient);
    mockMyVRClient
      .onGet(`/properties/${MOCK_PROPERTY_EXTERNAL_ID}/`)
      .reply(200, myVRProperty);

    getProperty(`IELV_${MOCK_PROPERTY_ID}`).then(data => {
      expect(data).toEqual(myVRProperty);
    });
  });

  it('should call the MyVR API and return Not Found when the property does not exist', () => {
    const mockMyVRClient = new MockAdapter(myVRClient);
    mockMyVRClient
      .onGet(`/properties/${MOCK_PROPERTY_EXTERNAL_ID}/`)
      .reply(404);

    getProperty(`IELV_${MOCK_PROPERTY_ID}`).then(data => {
      expect(data).toEqual(NOT_FOUND);
    });
  });
});

describe('putDescription', () => {
  it('should call the MyVR API and return the updated property', () => {
    const mockMyVRClient = new MockAdapter(myVRClient);
    mockMyVRClient
      .onPut(`/properties/${MOCK_PROPERTY_EXTERNAL_ID}/`)
      .reply(200, updatedProperty);

    putDescription({
      name: MOCK_PROPERTY_NAME,
      description: ielvDescription,
      externalId: MOCK_PROPERTY_EXTERNAL_ID,
    }).then(data => {
      expect(data).toEqual(updatedProperty);
    });
  });

  it('should call the MyVR API and return an error message if the request fails', () => {
    const mockMyVRClient = new MockAdapter(myVRClient);
    mockMyVRClient
      .onPut(`/properties/${MOCK_PROPERTY_EXTERNAL_ID}/`)
      .reply(404);

    putDescription({
      name: MOCK_PROPERTY_NAME,
      description: ielvDescription,
      externalId: `${MOCK_PROPERTY_EXTERNAL_ID}`,
    }).then(data => {
      expect(data).toEqual(NOT_FOUND);
    });
  });
});

describe('postProperty', () => {
  it('should call the MyVR API and return the updated property', () => {
    const mockMyVRClient = new MockAdapter(myVRClient);
    mockMyVRClient.onPost(`/properties/`).reply(200, updatedProperty);

    postProperty({
      name: MOCK_PROPERTY_NAME,
      description: ielvDescription,
      externalId: MOCK_PROPERTY_EXTERNAL_ID,
    }).then(data => {
      expect(data).toEqual(updatedProperty);
    });
  });

  it('should call the MyVR API and return an error message if the request fails', () => {
    const mockMyVRClient = new MockAdapter(myVRClient);
    mockMyVRClient.onPost(`/properties/`).reply(404);

    postProperty({
      name: MOCK_PROPERTY_NAME,
      description: ielvDescription,
      externalId: `${MOCK_PROPERTY_EXTERNAL_ID}`,
    }).then(data => {
      expect(data).toEqual(NOT_FOUND);
    });
  });
});

describe('buildDescription', () => {
  const builtDescription = buildDescription({
    description: ielvDescription,
    locations: ielvLocations,
    facilities: ielvFacilities,
    services: ielvServices,
    restrictions: ielvRestrictions,
    rooms: ielvRooms,
  });

  it('should contain the IELV description', () => {
    expect(builtDescription).toContain(ielvDescription);
  });

  it('should contain the IELV location data', () => {
    expect(builtDescription).toContain(ielvLocations[0].location[0]);
    expect(builtDescription).toContain(ielvLocations[0].location[1]);
    expect(builtDescription).toContain(ielvLocations[0].location[2]);
    ielvLocations[0].location.forEach(location =>
      expect(builtDescription).toContain(location)
    );
  });

  it('should contain the IELV facilities data', () => {
    expect(builtDescription).toContain(ielvFacilities[0].facility[0]);
    ielvFacilities[0].facility.forEach(facility =>
      expect(builtDescription).toContain(facility)
    );
  });

  it('should contain the IELV services', () => {
    expect(builtDescription).toContain(ielvServices[0].service[0]);
    ielvServices[0].service.forEach(service =>
      expect(builtDescription).toContain(service)
    );
  });

  it('should contain the IELV restrictions', () => {
    expect(builtDescription).toContain(ielvRestrictions[0].restriction[0]);
    ielvRestrictions[0].restriction.forEach(restriction =>
      expect(builtDescription).toContain(restriction)
    );
  });

  it('should contain the IELV rooms', () => {
    expect(builtDescription).toContain(ielvRooms[0].view[0]);
    ielvRooms.forEach(room =>
      Object.entries(room).forEach(
        ([key, value]) =>
          key === '$'
            ? expect(builtDescription).toContain(value.type) &&
              expect(builtDescription).toContain(value.index)
            : expect(builtDescription).toContain(value[0])
      )
    );
  });

  it('should contain all of the expected values, formatted as HTML -- regression test', () => {
    expect(builtDescription.trim()).toEqual(expectedHTML.trim());
  });
});
