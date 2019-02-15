import fs from 'fs';
import MockAdapter from 'axios-mock-adapter';

import updateProperty from '../../src/ielv/updateProperty';
import { myVRClient } from '../../src/api/client';

// Mock JSON Response Data
import ielvProperty from '../mockData/ielv/property.json';
import myVRProperty from '../mockData/myvr/property.json';
import myVRRoom from '../mockData/myvr/room.json';

// Initialize the custom axios instance
const MOCK_PROPERTY_ID = 1234;
const mockMyVRClient = new MockAdapter(myVRClient);

// PUT Stubs
const tmpProperty = Object.assign(myVRProperty, {
  description: ielvProperty.title[0],
});
mockMyVRClient
  .onPut(`/properties/IELV_${MOCK_PROPERTY_ID}/`)
  .reply(200, tmpProperty);

// POST Stubs
mockMyVRClient.onPost(`/rooms/`).reply(200, myVRRoom);

describe('updateProperty', () => {
  it('should call the MyVR API with a payload and return the updated property', () => {
    updateProperty(ielvProperty).then(data => {
      expect(data).toEqual([tmpProperty, myVRRoom]);
    });
  });
});
