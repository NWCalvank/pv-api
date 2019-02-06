import MockAdapter from 'axios-mock-adapter';

import handler from '../src/first';
import apiClient from '../src/api/client';

// Initialize the custom axios instance
const mock = new MockAdapter(apiClient);

// Mock Outgoing API Requests/Responses
mock.onGet('/properties/').reply(200, {
  count: 0,
  limit: 20,
  offset: 0,
  next: null,
  previous: null,
  results: [],
});

// Mock Express HTTP Requests/Responses
const mockHeader = header => key => header[key];
const reqBuilder = authHeader => ({
  header: mockHeader({
    Authorization: authHeader,
  }),
});

const resBuilder = (expectedStatus, expectedStatusMessage) => ({
  send: ({ status, status_message: statusMessage }) => {
    expect(status).toBe(expectedStatus);
    expect(statusMessage).toBe(expectedStatusMessage);
  },
});

describe('handler', () => {
  it('should return a 200 OK response when provided with valid auth', () => {
    const req = reqBuilder(process.env.API_KEY);
    const res = resBuilder(200, 'OK');
    handler(req, res);
  });

  it('should call the external API and return the response', () => {
    // Mock HTTP Responses
    const req = reqBuilder(process.env.API_KEY);
    const res = resBuilder(200, 'OK');

    handler(req, res).then(({ data }) => {
      // Test outgoing API calls
      expect(data).toEqual({
        count: 0,
        limit: 20,
        offset: 0,
        next: null,
        previous: null,
        results: [],
      });
    });
  });

  it('should return a 401 unauthorized response when provided with invalid auth', () => {
    const req = reqBuilder('aklsjhdlakjsdhasdsskjdh');
    const res = resBuilder(401, 'Unauthorized');
    handler(req, res).catch(() => {
      expect(true);
    });
  });

  it('should return a rejected promise when provided with invalid auth', () => {
    const req = reqBuilder('aklsjhdlakjsdhasdsskjdh');
    const res = resBuilder(401, 'Unauthorized');
    handler(req, res).catch(err => {
      expect(err).not.toBeUndefined();
    });
  });
});
