import fs from 'fs';

import {
  buildDescription,
  parseBedSize,
  sortRates,
  seasonalMinimum,
} from '../../../src/ielv/updateProperty';

// Mock JSON Response Data
import ielvProperty from '../../mockData/ielv/property.json';

const expectedHTML = fs.readFileSync(
  `${process.env.PWD}/spec/mockData/myvr/formattedHTML.txt`,
  'utf8'
);

// Resulting Mock Data
const [ielvDescription] = ielvProperty.description;
const ielvLocations = ielvProperty.locations;
const ielvPools = ielvProperty.pools;
const ielvFacilities = ielvProperty.facilities;
const ielvServices = ielvProperty.services;
const ielvRestrictions = ielvProperty.restrictions;
const ielvRooms = ielvProperty.rooms[0].room;

describe('seasonalMinimum', () => {
  it('should parse the rate name string and return the expected minimum stay', () => {
    expect(seasonalMinimum('Low Season 2020')).toEqual(5);
    expect(seasonalMinimum('High Season 2020')).toEqual(7);
    expect(seasonalMinimum('Christmas 2020 - New Year 2021')).toEqual(14);
    expect(seasonalMinimum('Thanksgiving 2019')).toEqual(14);
  });
});

describe('parseBedSize', () => {
  it('should parse the bed_size string and return a valid MyVR bedSize', () => {
    expect(parseBedSize('King 6.56 × 6.56')).toEqual('king');
    expect(parseBedSize('King 6.56 × 6.56 Twin')).toEqual('king');
    expect(parseBedSize('Twin 3.56 × 6.56')).toEqual('twin');
    expect(parseBedSize('Queen 4.56 × 6.56')).toEqual('queen');
    expect(parseBedSize('4.56 × 6.56')).toEqual('other');
  });
});

describe('buildDescription', () => {
  const builtDescription = buildDescription({
    description: ielvDescription,
    locations: ielvLocations,
    pools: ielvPools,
    facilities: ielvFacilities,
    services: ielvServices,
    restrictions: ielvRestrictions,
    rooms: ielvRooms,
  });

  it('should contain the IELV description', () => {
    expect(builtDescription).toContain(ielvDescription);
  });

  it('should contain the IELV location data', () => {
    expect(builtDescription).toContain(ielvLocations[0].location[0]);
    expect(builtDescription).toContain(ielvLocations[0].location[1]);
    expect(builtDescription).toContain(ielvLocations[0].location[2]);
    ielvLocations[0].location.forEach(location =>
      expect(builtDescription).toContain(location)
    );
  });

  it('should contain the IELV pools data', () => {
    expect(builtDescription).toContain(ielvPools[0].pool[0].description[0]);
    ielvPools[0].pool.forEach(({ description: [text] }) =>
      expect(builtDescription).toContain(text)
    );
  });

  it('should contain the IELV facilities data', () => {
    expect(builtDescription).toContain(ielvFacilities[0].facility[0]);
    ielvFacilities[0].facility.forEach(facility =>
      expect(builtDescription).toContain(facility)
    );
  });

  it('should contain the IELV services', () => {
    expect(builtDescription).toContain(ielvServices[0].service[0]);
    ielvServices[0].service.forEach(service =>
      expect(builtDescription).toContain(service)
    );
  });

  it('should contain the IELV restrictions', () => {
    expect(builtDescription).toContain(ielvRestrictions[0].restriction[0]);
    ielvRestrictions[0].restriction.forEach(restriction =>
      expect(builtDescription).toContain(restriction)
    );
  });

  it('should contain the IELV rooms', () => {
    expect(builtDescription).toContain(ielvRooms[0].view[0]);
    ielvRooms.forEach(room =>
      Object.entries(room).forEach(
        ([key, value]) =>
          key === '$'
            ? expect(builtDescription).toContain(value.type) &&
              expect(builtDescription).toContain(value.index)
            : expect(builtDescription).toContain(value[0])
      )
    );
  });

  it('should contain all of the expected values, formatted as HTML -- regression test', () => {
    expect(builtDescription.trim()).toEqual(expectedHTML.trim());
  });
});

describe('sortRates', () => {
  it('should extract all price strings and return a sorted, flattened array', () => {
    expect(
      sortRates({
        price: [
          {
            $: {
              from: '2019-04-16',
              to: '2019-11-23',
              name: 'Low Season 2019',
            },
            bedroom_count: [
              { _: '$ 20,000', $: { bedroom: '1' } },
              { _: '$ 20,000', $: { bedroom: '2' } },
              { _: '$ 20,000', $: { bedroom: '3' } },
              { _: '$ 25,000', $: { bedroom: '4' } },
            ],
          },
          {
            $: {
              from: '2019-01-06',
              to: '2019-04-16',
              name: 'High Season 2019',
            },
            bedroom_count: [
              { _: '$ 25,000', $: { bedroom: '1' } },
              { _: '$ 25,000', $: { bedroom: '2' } },
              { _: '$ 30,000', $: { bedroom: '3' } },
              { _: '$ 35,000', $: { bedroom: '4' } },
            ],
          },
          {
            $: {
              from: '2020-01-11',
              to: '2020-04-16',
              name: 'High Season 2020',
            },
            bedroom_count: [
              { _: '$ 25,000', $: { bedroom: '1' } },
              { _: '$ 25,000', $: { bedroom: '2' } },
              { _: '$ 30,000', $: { bedroom: '3' } },
              { _: '$ 35,000', $: { bedroom: '4' } },
            ],
          },
        ],
        notice: [
          'Please note the prices above do not include 10% service charge and 5% tourism tax.',
        ],
      })
    ).toEqual([
      2000000,
      2000000,
      2000000,
      2500000,
      2500000,
      2500000,
      2500000,
      2500000,
      3000000,
      3000000,
      3500000,
      3500000,
    ]);
  });
});
