import {
  parseBedSize,
  parseAvailabilityStatus,
  sortRates,
  seasonalMinimum,
  formatLatLon,
} from '../../../src/ielv/updateProperty';

describe('seasonalMinimum', () => {
  it('should parse the rate name string and return the expected minimum stay', () => {
    expect(seasonalMinimum('Low Season 2020')).toEqual(5);
    expect(seasonalMinimum('High Season 2020')).toEqual(7);
    expect(seasonalMinimum('Christmas 2020 - New Year 2021')).toEqual(14);
    expect(seasonalMinimum('Thanksgiving 2019')).toEqual(14);
  });
});

describe('formatLatLon', () => {
  it('should parse the location string and return a lat/lon to 10 decimal places', () => {
    expect(formatLatLon('170.8859861111111')).toEqual('170.8859861111');
  });

  it('should parse the location string and return a lat/lon to 13 digits', () => {
    expect(formatLatLon('17.8859861111111')).toEqual('17.8859861111');
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

describe('parseAvailabilityStatus', () => {
  it('should parse the status and return false or a valid MyVR reservation string', () => {
    expect(parseAvailabilityStatus('Reserved')).toEqual('reserved');
    expect(parseAvailabilityStatus('Free')).toEqual(false);
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
