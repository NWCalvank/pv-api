import fs from 'fs';
import MockAdapter from 'axios-mock-adapter';

import getAllProperties from '../../src/ielv/getAllProperties';
import { ielvClient } from '../../src/api/client';

// Mock XML Response Data
const ielvGetAllResponse = fs.readFileSync(
  `/app/spec/mockData/ielv/getAllResponse.xml`,
  'utf8'
);

// Initialize the custom axios instance
const mockIelvClient = new MockAdapter(ielvClient);

mockIelvClient.onGet('/villas.xml').reply(200, ielvGetAllResponse);

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
