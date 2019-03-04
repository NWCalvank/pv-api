import fs from 'fs';
import MockAdapter from 'axios-mock-adapter';

import handler from '../../src/ielv/main';
import { ielvClient, myVRClient } from '../../src/api/client';

// Mock JSON Response Data
import ielvProperty from '../mockData/ielv/property.json';
import myVRProperty from '../mockData/myvr/property.json';
import myVRRoom from '../mockData/myvr/room.json';

// Mock XML Response Data
const ielvGetAllResponse = fs.readFileSync(
  `${process.env.PWD}/spec/mockData/ielv/getAllResponse.xml`,
  'utf8'
);
const ielvGetPropertyDetailsResponse = fs.readFileSync(
  `${process.env.PWD}/spec/mockData/ielv/getPropertyDetailsResponse.xml`,
  'utf8'
);

// Initialize the custom axios instance
const MOCK_PROPERTY_ID = 1234;
const mockIelvClient = new MockAdapter(ielvClient);
const mockMyVRClient = new MockAdapter(myVRClient);

// GET Stubs
mockIelvClient.onGet('/villas.xml').reply(200, ielvGetAllResponse);
mockIelvClient
  .onGet(`/villas.xml/${MOCK_PROPERTY_ID}`)
  .reply(200, ielvGetPropertyDetailsResponse);

// PUT Stubs
const tmpProperty = { ...myVRProperty, description: ielvProperty.title[0] };
mockMyVRClient
  .onPut(`/properties/IELV_${MOCK_PROPERTY_ID}/`)
  .reply(200, tmpProperty);

// POST Stubs
mockMyVRClient.onPost(`/rooms/`).reply(200, myVRRoom);

// Mock Express HTTP Requests/Responses
const mockHeader = header => key => header[key];
const mockRes = { send: () => {} };

const reqBuilder = authHeader => ({
  header: mockHeader({
    Authorization: authHeader,
  }),
});

const expectedResBuilder = (expectedStatus, expectedStatusMessage) => ({
  send: ({ status, status_message: statusMessage }) => {
    expect(status).toBe(expectedStatus);
    expect(statusMessage).toBe(expectedStatusMessage);
  },
});

describe('handler', () => {
  // Test HTTP Responses
  it('should return a 200 OK response when provided with valid auth', () => {
    const req = reqBuilder(process.env.MY_VR_API_KEY);
    const res = expectedResBuilder(200, 'OK');
    handler(req, res);
  });

  it('should return a 401 unauthorized response when provided with invalid auth', () => {
    const req = reqBuilder('aklsjhdlakjsdhasdsskjdh');
    const res = expectedResBuilder(401, 'Unauthorized');
    handler(req, res).catch(err => {
      expect(err).not.toBeUndefined();
    });
  });

  // Test Function Invocation
  it('should return a promise of all property details', () => {
    const req = reqBuilder(process.env.MY_VR_API_KEY);
    const res = expectedResBuilder(200, 'OK');
    const allPropertyDetails = [ielvProperty];
    handler(req, res).then(response => {
      expect(response).toEqual(allPropertyDetails);
    });
  });

  it('should return a rejected promise when provided with invalid auth', () => {
    const req = reqBuilder('aklsjhdlakjsdhasdsskjdh');
    handler(req, mockRes).catch(() => {
      expect(true);
    });
  });
});
