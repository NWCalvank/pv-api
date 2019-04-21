import fs from 'fs';

import buildDescription from '../../../src/ielv/buildDescription';

// Mock JSON Response Data
import ielvProperty from '../../mockData/ielv/property.json';

const expectedHTML = fs.readFileSync(
  `${process.env.PWD}/spec/mockData/myvr/formattedHTML.txt`,
  'utf8'
);

// Resulting Mock Data
const [name] = ielvProperty.title;
const [ielvDescription] = ielvProperty.description;
const ielvLocations = ielvProperty.locations;
const ielvPools = ielvProperty.pools;
const ielvFacilities = ielvProperty.facilities;
const ielvServices = ielvProperty.services;
const ielvRestrictions = ielvProperty.restrictions;
const ielvRooms = ielvProperty.rooms[0].room;
const ielvBedrooms = ielvRooms.filter(({ $: { type } }) => type === 'Bedroom');
const ielvKitchen = ielvRooms.filter(({ $: { type } }) => type === 'Kitchen');
const ielvLivingRoom = ielvRooms.filter(({ $: { type } }) =>
  type.toLowerCase().includes('living')
);

describe('buildDescription', () => {
  const builtDescription = buildDescription({
    name,
    description: ielvDescription,
    locations: ielvLocations,
    pools: ielvPools,
    facilities: ielvFacilities,
    services: ielvServices,
    restrictions: ielvRestrictions,
    bedrooms: ielvBedrooms,
    kitchen: ielvKitchen,
    livingRoom: ielvLivingRoom,
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

  it('should contain the IELV bedrooms', () => {
    expect(builtDescription).toContain(ielvBedrooms[0].view[0]);
    ielvBedrooms.forEach(room =>
      Object.entries(room).forEach(([key, value]) => {
        if (key === '$') {
          expect(builtDescription).toContain(value.type);
          expect(builtDescription).toContain(value.index);
        } else if (key === 'other') {
          expect(builtDescription).toContain(
            value[0]
              .replace(/\n/g, ' ')
              .replace(/\s\s\*/g, ',')
              .replace(/\s\*/g, ',')
              .replace(/\*/g, '')
          );
        } else {
          expect(builtDescription).toContain(value[0]);
        }
      })
    );
  });

  it('should contain the IELV living room', () => {
    expect(builtDescription).toContain(ielvLivingRoom[0].view[0]);
    ielvLivingRoom.forEach(room =>
      Object.entries(room).forEach(([key, value]) => {
        if (key === '$') {
          expect(builtDescription).toContain(value.type);
          expect(builtDescription).toContain(value.index);
        } else if (key === 'other') {
          expect(builtDescription).toContain(
            value[0]
              .replace(/\n/g, ' ')
              .replace(/\s\s\*/g, ',')
              .replace(/\s\*/g, ',')
              .replace(/\*/g, '')
          );
        } else {
          expect(builtDescription).toContain(value[0]);
        }
      })
    );
  });

  it('should contain all of the expected values, formatted as HTML -- regression test', () => {
    expect(builtDescription.trim()).toEqual(expectedHTML.trim());
  });
});
