import fs from 'fs';
import MockAdapter from 'axios-mock-adapter';

import handler, { getAllProperties } from '../src/ielv';
import { ielvClient } from '../src/api/client';

// Initialize the custom axios instance
const mock = new MockAdapter(ielvClient);

const ielvGetAllResponse = fs.readFileSync(
  `/app/spec/mockData/ielvGetAllResponse.xml`,
  'utf8'
);

// Mock Outgoing API Requests/Responses
mock.onGet('/villas.xml').reply(200, ielvGetAllResponse);

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
