import MockAdapter from 'axios-mock-adapter';

import {
  updateProperty,
  getProperty,
  putDescription,
  postProperty,
  getExistingGroups,
  addToGroup,
  conditionallyAddToGroup,
  getExistingBedrooms,
  createMyVRRoom,
  postBedrooms,
} from '../../../src/ielv/updateProperty';
import { myVRClient, gcpClient } from '../../../src/api/client';
import { syncRates } from '../../../src/ielv/updateRates';
import { updateCalendarEvents } from '../../../src/ielv/updateAvailability';
import { NOT_FOUND } from '../../../src/globals';

// Mock JSON Response Data
import ielvProperty from '../../mockData/ielv/property.json';
import myVRProperty from '../../mockData/myvr/property.json';
import myVRPropertyMembership from '../../mockData/myvr/property-membership.json';
import myVRRoom from '../../mockData/myvr/room.json';
import myVRRooms from '../../mockData/myvr/rooms.json';
import myVRRates from '../../mockData/myvr/rates.json';
import myVRFees from '../../mockData/myvr/fees.json';
import myVRPhotos from '../../mockData/myvr/photos.json';
import myVRCalendarEvents from '../../mockData/myvr/calendar-events.json';
import myVRAmenities from '../../mockData/myvr/amenities.json';

// Initialize the custom axios instance
const mockGcpClient = new MockAdapter(gcpClient);
mockGcpClient
  .onPost('/ielvFetchDetails')
  .reply(200)
  .onPost('/ielvUpdateProperty')
  .reply(200)
  .onPost('/ielvUpdateAvailability')
  .reply(200)
  .onPost('/ielvUpdateRates')
  .reply(200);

const MOCK_PROPERTY_ID = 1234;
const MOCK_PROPERTY_NAME = 'Mock Property';
const MOCK_PROPERTY_EXTERNAL_ID = `IELV_${MOCK_PROPERTY_ID}`;

// Resulting Mock Data
const [ielvDescription] = ielvProperty.description;
const ielvRooms = ielvProperty.rooms[0].room;
const [ielvRates] = ielvProperty.prices;
const [ielvAvailability] = ielvProperty.availability;
// Updated Details - No Bedrooms
const tmpProperty = { ...myVRProperty, description: ielvDescription };
// Fully-updated Property
const updatedProperty = {
  ...myVRProperty,
  description: ielvDescription,
  bedCount: 1,
  beds: [],
};
const firstMembership = {
  ...myVRPropertyMembership.results[0],
  key: process.env.MY_VR_GROUP_KEY_1,
};
const secondMembership = {
  ...myVRPropertyMembership.results[0],
  key: process.env.MY_VR_GROUP_KEY_2,
};
const myVRPropertyMembershipWithKey = {
  ...myVRPropertyMembership,
  results: [
    ...myVRPropertyMembership.results,
    firstMembership,
    secondMembership,
  ],
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

      // START -- addToGroup API call stubs - already in group
      .onGet(`/property-memberships/?property=${MOCK_PROPERTY_EXTERNAL_ID}`)
      .replyOnce(200, myVRPropertyMembershipWithKey)
      // END -- addToGroup API call stubs

      // START -- syncRates API call stubs
      .onGet(`/rates/?property=${MOCK_PROPERTY_EXTERNAL_ID}`)
      .replyOnce(200, myVRRates)
      .onDelete(`rates/rate1/`)
      .replyOnce(200)
      .onDelete(`rates/rate2/`)
      .replyOnce(200)
      .onDelete(`rates/rate3/`)
      .replyOnce(200)
      // Create base rate
      .onPost(`/rates/`)
      // Create all other rates
      .replyOnce(200)
      .onPost(`/rates/`)
      .replyOnce(200)
      .onPost(`/rates/`)
      .replyOnce(200)
      .onPost(`/rates/`)
      .replyOnce(200)
      // END -- syncRates API call stubs

      // START -- setFees API call stubs
      .onGet(`/fees/?property=${MOCK_PROPERTY_EXTERNAL_ID}`)
      .replyOnce(200, myVRFees)
      .onPut(`/fees/tax1/`)
      .replyOnce(200)
      .onPut(`/fees/serviceCharge1/`)
      .replyOnce(200)
      // END -- setFees API call stubs

      // START -- updateCalendarEvents call stubs
      .onGet(
        `/calendar-events/?property=${MOCK_PROPERTY_EXTERNAL_ID}&limit=200`
      )
      .replyOnce(200, myVRCalendarEvents)
      .onDelete(`/calendar-events/event1/`)
      .replyOnce(200)
      .onDelete(`/calendar-events/event2/`)
      .replyOnce(200)
      .onPost(`/calendar-events/`, {
        property: MOCK_PROPERTY_EXTERNAL_ID,
        startDate: '2018-12-29',
        endDate: '2019-01-11',
        status: 'reserved',
        title: 'IELV',
      })
      .replyOnce(200)
      .onPost(`/calendar-events/`, {
        property: MOCK_PROPERTY_EXTERNAL_ID,
        startDate: '2019-01-15',
        endDate: '2019-01-20',
        status: 'reserved',
        title: 'IELV',
      })
      .replyOnce(200)
      // END -- updateCalendarEvents call stubs

      // START -- addPhotos API call stubs all photos exist
      .onGet(`/photos/?property=${MOCK_PROPERTY_EXTERNAL_ID}&limit=200`)
      .replyOnce(200, myVRPhotos)
      // END -- addPhotos API call stubs

      .onGet(`/properties/${MOCK_PROPERTY_EXTERNAL_ID}/`)
      .replyOnce(200, updatedProperty)

      // START -- setAmenities all amenities exist
      .onGet(
        `/property-amenities/?property=${MOCK_PROPERTY_EXTERNAL_ID}&limit=100`
      )
      .replyOnce(200, myVRAmenities);

    updateProperty(ielvProperty).then(res => {
      expect(res).toEqual(MOCK_PROPERTY_EXTERNAL_ID);
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
      .replyOnce(200, { results: [] })
      // post rooms
      .onPost(`/rooms/`)
      .replyOnce(200, mockMyVRRoom('room1'))
      .onPost(`/rooms/`)
      .replyOnce(200, mockMyVRRoom('room2'))
      .onPost(`/rooms/`)
      .replyOnce(200, mockMyVRRoom('room3'))
      .onPost(`/rooms/`)
      .replyOnce(200, mockMyVRRoom('room4'))
      // END -- postBedrooms API call stubs

      // START -- syncRates API call stubs
      .onGet(`/rates/?property=${MOCK_PROPERTY_EXTERNAL_ID}`)
      .replyOnce(200, { results: [] })
      .onPost(`/rates/`)
      .replyOnce(200)
      .onPost(`/rates/`)
      .replyOnce(200)
      .onPost(`/rates/`)
      .replyOnce(200)
      .onPost(`/rates/`)
      .replyOnce(200)
      // END -- syncRates API call stubs

      // START -- addToGroup API call stubs - not in group
      .onGet(`/property-memberships/?property=${MOCK_PROPERTY_EXTERNAL_ID}`)
      .replyOnce(200, myVRPropertyMembership)
      .onPost(`/property-memberships/`, {
        group: process.env.MY_VR_GROUP_KEY_1,
        property: MOCK_PROPERTY_EXTERNAL_ID,
      })
      .replyOnce(200)
      // END -- addToGroup API call stubs

      // START -- setFees API call stubs
      .onGet(`/fees/?property=${MOCK_PROPERTY_EXTERNAL_ID}`)
      .replyOnce(200, { results: [] })
      .onPost(`/fees/`)
      .replyOnce(200)
      .onPost(`/fees/`)
      .replyOnce(200)
      // END -- setFees API call stubs

      // START -- updateCalendarEvents call stubs
      .onGet(
        `/calendar-events/?property=${MOCK_PROPERTY_EXTERNAL_ID}&limit=200`
      )
      .replyOnce(200, { results: [] })
      .onPost(`/calendar-events/`, {
        property: MOCK_PROPERTY_EXTERNAL_ID,
        startDate: '2018-12-29',
        endDate: '2019-01-11',
        status: 'reserved',
        title: 'IELV',
      })
      .replyOnce(200)
      .onPost(`/calendar-events/`, {
        property: MOCK_PROPERTY_EXTERNAL_ID,
        startDate: '2019-01-15',
        endDate: '2019-01-20',
        status: 'reserved',
        title: 'IELV',
      })
      .replyOnce(200)
      // END -- updateCalendarEvents call stubs

      // START -- addPhotos API call stubs no existing photos
      .onGet(`/photos/?property=${MOCK_PROPERTY_EXTERNAL_ID}&limit=200`)
      .replyOnce(200, { results: [] })
      .onPost('/photos/', {
        property: MOCK_PROPERTY_EXTERNAL_ID,
        sourceUrl:
          'https://i.pinimg.com/originals/36/4b/9c/364b9c4ffc69a83be5315d8af09e572d.jpg',
      })
      .replyOnce(200)
      .onPost('/photos/', {
        property: MOCK_PROPERTY_EXTERNAL_ID,
        sourceUrl:
          'http://s1.1zoom.me/b5050/934/Penguins_Sea_Sky_King_435441_1920x1200.jpg',
      })
      .replyOnce(200)
      // END -- addPhotos API call stubs

      .onGet(`/properties/${MOCK_PROPERTY_EXTERNAL_ID}/`)
      .replyOnce(200, updatedProperty)

      // START -- setAmenities call stubs
      .onGet(
        `/property-amenities/?property=${MOCK_PROPERTY_EXTERNAL_ID}&limit=100`
      )
      // Missing 1 amenity
      .replyOnce(200, { results: myVRAmenities.results.slice(1) })
      .onPost(/property-amenities/, {
        property: MOCK_PROPERTY_EXTERNAL_ID,
        amenity: 'e433c1fce3967c6a',
        count: 1,
      })
      .replyOnce(200);

    updateProperty(ielvProperty).then(res => {
      expect(res).toEqual(MOCK_PROPERTY_EXTERNAL_ID);
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
  const payload = {
    name: MOCK_PROPERTY_NAME,
    description: ielvDescription,
    externalId: `${MOCK_PROPERTY_EXTERNAL_ID}`,
    postalCode: '97700',
  };
  it('should call the MyVR API and return the updated property', () => {
    const mockMyVRClient = new MockAdapter(myVRClient);

    mockMyVRClient
      .onPut(`/properties/${MOCK_PROPERTY_EXTERNAL_ID}/`, payload)
      .reply(200, updatedProperty);

    putDescription(payload).then(data => {
      expect(data).toEqual(updatedProperty);
    });
  });

  it('should call the MyVR API and return an error message if the request fails', () => {
    const mockMyVRClient = new MockAdapter(myVRClient);

    mockMyVRClient
      .onPut(`/properties/${MOCK_PROPERTY_EXTERNAL_ID}/`, payload)
      .reply(404);

    putDescription(payload).then(data => {
      expect(data).toEqual(NOT_FOUND);
    });
  });
});

describe('postProperty', () => {
  const payload = {
    name: MOCK_PROPERTY_NAME,
    description: ielvDescription,
    externalId: MOCK_PROPERTY_EXTERNAL_ID,
    postalCode: '97700',
  };
  it('should call the MyVR API and return the updated property', () => {
    const mockMyVRClient = new MockAdapter(myVRClient);

    mockMyVRClient.onPost(`/properties/`, payload).reply(200, updatedProperty);

    postProperty(payload).then(data => {
      expect(data).toEqual(updatedProperty);
    });
  });

  it('should call the MyVR API and return an error message if the request fails', () => {
    const mockMyVRClient = new MockAdapter(myVRClient);
    mockMyVRClient.onPost(`/properties/`, payload).reply(404);

    postProperty(payload).then(data => {
      expect(data).toEqual(NOT_FOUND);
    });
  });
});

describe('updateCalendarEvents', () => {
  it('should call the MyVR calendar-events endpoint to check and create reservations', () => {
    const mockMyVRClient = new MockAdapter(myVRClient);

    mockMyVRClient
      .onGet(
        `/calendar-events/?property=${MOCK_PROPERTY_EXTERNAL_ID}&limit=200`
      )
      .replyOnce(200, { results: [] })
      .onPost(`/calendar-events/`, {
        property: MOCK_PROPERTY_EXTERNAL_ID,
        startDate: '2018-12-29',
        endDate: '2019-01-11',
        status: 'reserved',
        title: 'IELV',
      })
      .replyOnce(200)
      .onPost(`/calendar-events/`, {
        property: MOCK_PROPERTY_EXTERNAL_ID,
        startDate: '2019-01-15',
        endDate: '2019-01-20',
        status: 'reserved',
        title: 'IELV',
      })
      .replyOnce(200);

    updateCalendarEvents(MOCK_PROPERTY_EXTERNAL_ID, ielvAvailability).then(
      data => {
        expect(data).not.toBeUndefined();
      }
    );
  });

  it('should call the MyVR calendar-events endpoint to delete existing IELV reservations', () => {
    const mockMyVRClient = new MockAdapter(myVRClient);

    mockMyVRClient
      .onGet(
        `/calendar-events/?property=${MOCK_PROPERTY_EXTERNAL_ID}&limit=200`
      )
      .replyOnce(200, myVRCalendarEvents)
      .onDelete(`/calendar-events/event1/`)
      .replyOnce(200)
      .onDelete(`/calendar-events/event2/`)
      .replyOnce(200)
      .onPost(`/calendar-events/`, {
        property: MOCK_PROPERTY_EXTERNAL_ID,
        startDate: '2018-12-29',
        endDate: '2019-01-11',
        status: 'reserved',
        title: 'IELV',
      })
      .replyOnce(200)
      .onPost(`/calendar-events/`, {
        property: MOCK_PROPERTY_EXTERNAL_ID,
        startDate: '2019-01-15',
        endDate: '2019-01-20',
        status: 'reserved',
        title: 'IELV',
      })
      .replyOnce(200);

    updateCalendarEvents(MOCK_PROPERTY_EXTERNAL_ID, ielvAvailability).then(
      data => {
        expect(data).not.toBeUndefined();
      }
    );
  });
});

describe('getExistingGroups', () => {
  it('should GET to the property-memberships API endpoint', () => {
    const mockMyVRClient = new MockAdapter(myVRClient);
    mockMyVRClient
      .onGet(`/property-memberships/?property=${MOCK_PROPERTY_EXTERNAL_ID}`)
      .replyOnce(200);
    getExistingGroups(MOCK_PROPERTY_EXTERNAL_ID);
  });
});

describe('addToGroup', () => {
  it('should POST to the property-memberships API endpoint', () => {
    const mockMyVRClient = new MockAdapter(myVRClient);
    mockMyVRClient
      .onPost(`/property-memberships/`, {
        group: process.env.MY_VR_GROUP_KEY_1,
        property: MOCK_PROPERTY_EXTERNAL_ID,
      })
      .replyOnce(200);
    addToGroup(MOCK_PROPERTY_EXTERNAL_ID);
  });
});

describe('conditionallyAddToGroup', () => {
  it('should call addToGroup if not already in group', () => {
    const mockMyVRClient = new MockAdapter(myVRClient);
    mockMyVRClient
      .onGet(`/property-memberships/?property=${MOCK_PROPERTY_EXTERNAL_ID}`)
      .replyOnce(200, myVRPropertyMembership)
      .onPost(`/property-memberships/`, {
        group: process.env.MY_VR_GROUP_KEY_1,
        property: MOCK_PROPERTY_EXTERNAL_ID,
      })
      .replyOnce(200, 'Post Response')
      .onPost(`/property-memberships/`, {
        group: process.env.MY_VR_GROUP_KEY_2,
        property: MOCK_PROPERTY_EXTERNAL_ID,
      })
      .replyOnce(200, 'Post Response');

    conditionallyAddToGroup(MOCK_PROPERTY_EXTERNAL_ID).then(data => {
      data.forEach(response => expect(response).toEqual('Post Response'));
    });
  });

  it('should not call addToGroup if already in group', () => {
    const mockMyVRClient = new MockAdapter(myVRClient);
    mockMyVRClient
      .onGet(`/property-memberships/?property=${MOCK_PROPERTY_EXTERNAL_ID}`)
      .replyOnce(200, myVRPropertyMembershipWithKey)
      .onPost(`/property-memberships/`, {
        group: process.env.MY_VR_GROUP_KEY_1,
        property: MOCK_PROPERTY_EXTERNAL_ID,
      })
      .replyOnce(200, 'Post Response');

    conditionallyAddToGroup(MOCK_PROPERTY_EXTERNAL_ID).then(data => {
      data.forEach(response => expect(response).toBeUndefined());
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
    mockMyVRClient
      .onPost(`/rooms/`, {
        property: MOCK_PROPERTY_EXTERNAL_ID,
        beds: [
          {
            size: 'king',
            type: 'standard',
            mattress: 'box',
          },
        ],
      })
      .reply(200, myVRRoom);

    createMyVRRoom(MOCK_PROPERTY_EXTERNAL_ID)({
      bed_size: ['King 6.56 × 6.56'],
    })().then(data => {
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
      // post rooms
      .onPost(`/rooms/`, {
        property: 'IELV_1234',
        beds: [{ size: 'king', type: 'standard', mattress: 'box' }],
      })
      .replyOnce(200, mockMyVRRoom('room1'))
      .onPost(`/rooms/`, {
        property: 'IELV_1234',
        beds: [{ size: 'queen', type: 'standard', mattress: 'box' }],
      })
      .replyOnce(200, mockMyVRRoom('room2'))
      .onPost(`/rooms/`, {
        property: 'IELV_1234',
        beds: [{ size: 'twin', type: 'standard', mattress: 'box' }],
      })
      .replyOnce(200, mockMyVRRoom('room3'))
      .onPost(`/rooms/`, {
        property: 'IELV_1234',
        beds: [{ size: 'king', type: 'standard', mattress: 'box' }],
      })
      .replyOnce(200, mockMyVRRoom('room4'));

    postBedrooms(MOCK_PROPERTY_EXTERNAL_ID, ielvRooms).then(data => {
      expect(data).toEqual(myVRRooms.results);
    });
  });
});

describe('syncRates', () => {
  it('should call the MyVR API to delete and then create all rates for the property', () => {
    const mockMyVRClient = new MockAdapter(myVRClient);
    mockMyVRClient
      .onGet(`/rates/?property=${MOCK_PROPERTY_EXTERNAL_ID}`)
      .replyOnce(200, myVRRates)
      .onDelete(`rates/rate1/`)
      .replyOnce(200)
      .onDelete(`rates/rate2/`)
      .replyOnce(200)
      .onDelete(`rates/rate3/`)
      .replyOnce(200)
      // Create base rate
      .onPost(`/rates/`, {
        property: MOCK_PROPERTY_EXTERNAL_ID,
        baseRate: true,
        minStay: 5,
        repeat: false,
        nightly: 285714,
        weekendNight: 285714,
      })
      // Create all other rates
      .replyOnce(200)
      .onPost(`/rates/`, {
        property: 'IELV_1234',
        baseRate: false,
        name: 'Low Season 2019',
        startDate: '2019-04-16',
        endDate: '2019-11-23',
        minStay: 5,
        repeat: false,
        nightly: 357143,
        weekendNight: 357143,
      })
      .replyOnce(200)
      .onPost(`/rates/`, {
        property: 'IELV_1234',
        baseRate: false,
        name: 'High Season 2019',
        startDate: '2019-01-06',
        endDate: '2019-04-16',
        minStay: 7,
        repeat: false,
        nightly: 500000,
        weekendNight: 500000,
      })
      .replyOnce(200)
      .onPost(`/rates/`, {
        property: 'IELV_1234',
        baseRate: false,
        name: 'High Season 2020',
        startDate: '2020-01-11',
        endDate: '2020-04-16',
        minStay: 7,
        repeat: false,
        nightly: 500000,
        weekendNight: 500000,
      })
      .replyOnce(200);

    syncRates(MOCK_PROPERTY_EXTERNAL_ID, ielvRates);
  });
});
