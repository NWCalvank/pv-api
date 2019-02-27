import fs from 'fs';
import MockAdapter from 'axios-mock-adapter';

import updateProperty, {
  NOT_FOUND,
  buildDescription,
  getProperty,
  putDescription,
  postProperty,
  getExistingBedrooms,
  parseBedSize,
  createMyVRRoom,
  postBedrooms,
} from '../../src/ielv/updateProperty';
import { myVRClient } from '../../src/api/client';

// Mock JSON Response Data
import ielvProperty from '../mockData/ielv/property.json';
import myVRProperty from '../mockData/myvr/property.json';
import myVRRoom from '../mockData/myvr/room.json';
import myVRRooms from '../mockData/myvr/rooms.json';

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

// Helpers
const mockMyVRRoom = id => ({
  ...myVRRoom,
  id,
  key: id,
  uri: `https://api.myvr.com/v1/rooms/${id}/`,
});

describe('updateProperty', () => {
  it('should call the MyVR API with a payload and return the updated property', () => {
    const mockMyVRClient = new MockAdapter(myVRClient);
    mockMyVRClient
      .onGet(`/properties/${MOCK_PROPERTY_EXTERNAL_ID}/`)
      .replyOnce(200, myVRProperty)
      .onPut(`/properties/${MOCK_PROPERTY_EXTERNAL_ID}/`)
      .replyOnce(200, tmpProperty)
      // START -- postBedrooms API call stubs
      .onGet(`/rooms/?property=${MOCK_PROPERTY_EXTERNAL_ID}`)
      .replyOnce(200, myVRRooms)
      // delete existing rooms
      .onDelete('/rooms/room1/')
      .replyOnce(200)
      .onDelete('/rooms/room2/')
      .replyOnce(200)
      .onDelete('/rooms/room3/')
      .replyOnce(200)
      .onDelete('/rooms/room4/')
      .replyOnce(200)
      // post existing rooms
      .onPost(`/rooms/`)
      .replyOnce(200, mockMyVRRoom('room1'))
      .onPost(`/rooms/`)
      .replyOnce(200, mockMyVRRoom('room2'))
      .onPost(`/rooms/`)
      .replyOnce(200, mockMyVRRoom('room3'))
      .onPost(`/rooms/`)
      .replyOnce(200, mockMyVRRoom('room4'))
      // END -- postBedrooms API call stubs
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
      // START -- postBedrooms API call stubs
      .onGet(`/rooms/?property=${MOCK_PROPERTY_EXTERNAL_ID}`)
      .replyOnce(200, myVRRooms)
      // delete existing rooms
      .onDelete('/rooms/room1/')
      .replyOnce(200)
      .onDelete('/rooms/room2/')
      .replyOnce(200)
      .onDelete('/rooms/room3/')
      .replyOnce(200)
      .onDelete('/rooms/room4/')
      .replyOnce(200)
      // post existing rooms
      .onPost(`/rooms/`)
      .replyOnce(200, mockMyVRRoom('room1'))
      .onPost(`/rooms/`)
      .replyOnce(200, mockMyVRRoom('room2'))
      .onPost(`/rooms/`)
      .replyOnce(200, mockMyVRRoom('room3'))
      .onPost(`/rooms/`)
      .replyOnce(200, mockMyVRRoom('room4'))
      // END -- postBedrooms API call stubs
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

describe('getExistingBedrooms', () => {
  it('should call the MyVR API and return the existing bedrooms for that property', () => {
    const mockMyVRClient = new MockAdapter(myVRClient);
    mockMyVRClient
      .onGet(`/rooms/?property=${MOCK_PROPERTY_EXTERNAL_ID}`)
      .reply(200, myVRRooms);

    getExistingBedrooms(MOCK_PROPERTY_EXTERNAL_ID).then(data => {
      expect(data).toEqual(myVRRooms.results);
    });
  });
});

describe('createMyVRRoom', () => {
  it('should call the MyVR API, create a room, and return the new bedrooms', () => {
    const mockMyVRClient = new MockAdapter(myVRClient);
    mockMyVRClient.onPost(`/rooms/`).reply(200, myVRRoom);

    createMyVRRoom(MOCK_PROPERTY_EXTERNAL_ID)({
      bed_size: ['King 6.56 × 6.56'],
    }).then(data => {
      expect(data).toEqual(myVRRoom);
    });
  });
});

describe('postBedrooms', () => {
  it('should call the MyVR API to delete existing and create new bedrooms', () => {
    const mockMyVRClient = new MockAdapter(myVRClient);
    mockMyVRClient
      .onGet(`/rooms/?property=${MOCK_PROPERTY_EXTERNAL_ID}`)
      .replyOnce(200, myVRRooms)
      // delete existing rooms
      .onDelete('/rooms/room1/')
      .replyOnce(200)
      .onDelete('/rooms/room2/')
      .replyOnce(200)
      .onDelete('/rooms/room3/')
      .replyOnce(200)
      .onDelete('/rooms/room4/')
      .replyOnce(200)
      // post existing rooms
      .onPost(`/rooms/`)
      .replyOnce(200, mockMyVRRoom('room1'))
      .onPost(`/rooms/`)
      .replyOnce(200, mockMyVRRoom('room2'))
      .onPost(`/rooms/`)
      .replyOnce(200, mockMyVRRoom('room3'))
      .onPost(`/rooms/`)
      .replyOnce(200, mockMyVRRoom('room4'));

    postBedrooms(MOCK_PROPERTY_EXTERNAL_ID, ielvRooms).then(data => {
      expect(data).toEqual(myVRRooms.results);
    });
  });
});

// Unit Tests

describe('parseBedSize', () => {
  it('should parse the bed_size string and return a valid MyVR bedSize', () => {
    expect(parseBedSize('King 6.56 × 6.56')).toEqual('king');
    expect(parseBedSize('King 6.56 × 6.56 Twin')).toEqual('king');
    expect(parseBedSize('Twin 3.56 × 6.56')).toEqual('twin');
    expect(parseBedSize('Queen 4.56 × 6.56')).toEqual('queen');
    expect(parseBedSize('4.56 × 6.56')).toEqual('other');
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
