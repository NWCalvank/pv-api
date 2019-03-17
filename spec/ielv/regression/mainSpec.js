import handler from '../../../src/ielv/main';

// Mock Express HTTP Requests/Responses
const mockHeader = header => key => header[key];

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
});
