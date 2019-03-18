import fs from 'fs';
import MockAdapter from 'axios-mock-adapter';

import getPropertyDetails from '../../src/ielv/getPropertyDetails';
import { ielvClient } from '../../src/api/client';

// Mock JSON Response Data
import ielvProperty from '../mockData/ielv/property.json';

// Mock XML Response Data
const ielvGetPropertyDetailsResponse = fs.readFileSync(
  `${process.env.PWD}/spec/mockData/ielv/getPropertyDetailsResponse.xml`,
  'utf8'
);

const MOCK_PROPERTY_ID = 1234;

describe('getPropertyDetails', () => {
  it('should call the IELV API with a property ID and return the response', () => {
    const mockIelvClient = new MockAdapter(ielvClient);

    // GET Stubs
    mockIelvClient
      .onGet(`/villas.xml/${MOCK_PROPERTY_ID}`)
      .reply(200, ielvGetPropertyDetailsResponse);

    getPropertyDetails(MOCK_PROPERTY_ID).then(data => {
      expect(data).toEqual(ielvProperty);
    });
  });
});
