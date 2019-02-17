import fs from 'fs';
import MockAdapter from 'axios-mock-adapter';

import updateProperty, {
  NOT_FOUND,
  getProperty,
  putDescription,
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
const mockMyVRClient = new MockAdapter(myVRClient);

// GET Stubs
mockMyVRClient
  .onGet(`/properties/${MOCK_PROPERTY_EXTERNAL_ID}/`)
  .reply(200, myVRProperty);
mockMyVRClient
  .onGet(`/properties/${MOCK_PROPERTY_EXTERNAL_ID}567/`)
  .reply(200, NOT_FOUND);

// PUT Stubs
const updatedDescription = ielvProperty.title[0];
const tmpProperty = Object.assign(myVRProperty, {
  description: updatedDescription,
});
mockMyVRClient
  .onPut(`/properties/${MOCK_PROPERTY_EXTERNAL_ID}/`)
  .reply(200, tmpProperty);
mockMyVRClient
  .onPut(`/properties/${MOCK_PROPERTY_EXTERNAL_ID}567/`)
  .reply(200, NOT_FOUND);

// POST Stubs
mockMyVRClient.onPost(`/rooms/`).reply(200, myVRRoom);

describe('updateProperty', () => {
  it('should call the MyVR API with a payload and return the updated property', () => {
    updateProperty(ielvProperty).then(data => {
      expect(data).toEqual([tmpProperty, myVRRoom]);
    });
  });
});

describe('getProperty', () => {
  it('should call the MyVR API and return the matching property', () => {
    getProperty(`IELV_${MOCK_PROPERTY_ID}`).then(data => {
      expect(data).toEqual(myVRProperty);
    });
  });

  it('should call the MyVR API and return Not Found when the property does not exist', () => {
    getProperty(`IELV_${MOCK_PROPERTY_ID}567`).then(data => {
      expect(data).toEqual(NOT_FOUND);
    });
  });
});

describe('putDescription', () => {
  it('should call the MyVR API and return the updated property', () => {
    putDescription({
      name: MOCK_PROPERTY_NAME,
      description: updatedDescription,
      externalId: MOCK_PROPERTY_EXTERNAL_ID,
    }).then(data => {
      expect(data).toEqual(tmpProperty);
    });
  });

  it('should call the MyVR API and return an error message if the request fails', () => {
    putDescription({
      name: MOCK_PROPERTY_NAME,
      description: updatedDescription,
      externalId: `${MOCK_PROPERTY_EXTERNAL_ID}567`,
    }).then(data => {
      expect(data).toEqual(NOT_FOUND);
    });
  });
});
