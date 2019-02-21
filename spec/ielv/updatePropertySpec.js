import MockAdapter from 'axios-mock-adapter';

import updateProperty, {
  NOT_FOUND,
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

// Resulting Mock Data
const updatedDescription = ielvProperty.description[0];
// Updated Details - No Bedrooms
const tmpProperty = { ...myVRProperty, description: updatedDescription };
// Fully-updated Property
const updatedProperty = {
  ...myVRProperty,
  description: updatedDescription,
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
      description: updatedDescription,
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
      description: updatedDescription,
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
      description: updatedDescription,
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
      description: updatedDescription,
      externalId: `${MOCK_PROPERTY_EXTERNAL_ID}`,
    }).then(data => {
      expect(data).toEqual(NOT_FOUND);
    });
  });
});
