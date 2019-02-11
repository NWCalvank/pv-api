import fs from 'fs';
import MockAdapter from 'axios-mock-adapter';

import handler, { getAllProperties, getPropertyDetails } from '../src/ielv';
import { ielvClient } from '../src/api/client';

import ielvProperty from './mockData/ielv/property.json';

const MOCK_PROPERTY_ID = 1234;

// Initialize the custom axios instance
const mock = new MockAdapter(ielvClient);

const ielvGetAllResponse = fs.readFileSync(
  `/app/spec/mockData/ielv/getAllResponse.xml`,
  'utf8'
);
const ielvGetPropertyDetailsResponse = fs.readFileSync(
  `/app/spec/mockData/ielv/getPropertyDetailsResponse.xml`,
  'utf8'
);

// Mock Outgoing API Requests/Responses
mock.onGet('/villas.xml').reply(200, ielvGetAllResponse);
mock
  .onGet(`/villas.xml/${MOCK_PROPERTY_ID}`)
  .reply(200, ielvGetPropertyDetailsResponse);

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
    const req = reqBuilder(process.env.IELV_API_KEY);
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
    const req = reqBuilder(process.env.IELV_API_KEY);
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

describe('getAllProperties', () => {
  it('should call the IELV API and return the response', () => {
    getAllProperties().then(data => {
      expect(data).toEqual([
        {
          id: ['1234'],
          title: ['Mock Property'],
          updated_at: ['2019-02-06 22:04:47 +0100'],
          description: [''],
          link: [
            'http://www.mockpropertydata.com/estate-details/villa/weekly-rental/mock-property/foo-bar',
          ],
        },
      ]);
    });
  });
});

describe('getPropertyDetails', () => {
  it('should call the IELV API with a property ID and return the response', () => {
    getPropertyDetails(MOCK_PROPERTY_ID).then(data => {
      expect(data).toEqual(ielvProperty);
    });
  });
});
