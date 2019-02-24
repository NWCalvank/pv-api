import { myVRClient } from '../api/client';
import { log } from '../util/logger';

export const NOT_FOUND = 'Not Found';

const htmlStyle = (items, title) => `
<br/>

<div><strong>${title}</strong></div>
<div>
<ul><li>
${items
  .map(obj => obj[title.toLowerCase()].join('</li><li>'))
  .join('</li><li>')}
</li></ul>
</div>
`;

export const buildDescription = ({
  description,
  locations,
  facilities,
  services,
  restrictions,
  rooms,
}) => `
<div><strong>Summary</strong></div>
<div>${description}</div>
${htmlStyle(locations, 'Location')}
${htmlStyle(facilities, 'Facility')}
${htmlStyle(services, 'Service')}
${htmlStyle(restrictions, 'Restriction')}

<br/>

<div>
${rooms
  .map(room =>
    Object.entries(room)
      .map(
        ([key, value]) =>
          key === '$'
            ? `<div><strong>${value.type} ${
                value.index === '1' ? '' : value.index
              }</strong></div><ul>`
            : `<li>${key}: ${value[0]}</li>`
      )
      .join('')
  )
  .join('</ul></div><br/><div>')}
<div>
`;

export const getProperty = externalId =>
  myVRClient
    .get(`/properties/${externalId}/`)
    .then(({ data }) => data)
    .catch(
      ({ response: { status } }) => (status === 404 ? NOT_FOUND : 'Other error')
    );

export const putDescription = ({ name, description, externalId }) =>
  myVRClient
    .put(`/properties/${externalId}/`, {
      // required
      name,
      // relevant payload
      description,
      // becomes null if not set explicitly
      externalId,
    })
    .then(({ data }) => data)
    .catch(
      // TODO: Improve this error message
      ({ response: { status } }) =>
        status === 404 ? NOT_FOUND : `Status: ${status}`
    );

export const postProperty = ({ name, description, externalId }) =>
  myVRClient
    .post(`/properties/`, {
      name,
      description,
      externalId,
    })
    .then(({ data }) => data)
    .catch(
      // TODO: Improve this error message
      ({ response: { status } }) =>
        status === 404 ? NOT_FOUND : `Status: ${status}`
    );

// TODO: Make this less naive
export const postBedrooms = externalId =>
  myVRClient
    .post('/rooms/', {
      property: externalId,
    })
    .then(({ data }) => data)
    .catch(log);

export default async ({
  id: [ielvId],
  title: [name],
  description: [ielvDescription],
  locations: ielvLocations,
  facilities: ielvFacilities,
  services: ielvServices,
  restrictions: ielvRestrictions,
  rooms: [{ room: ielvRooms }],
}) => {
  const externalId = `IELV_${ielvId}`;

  // GET property current details
  const property = await getProperty(externalId);

  // POST new property or PUT existing
  const method = property === NOT_FOUND ? postProperty : putDescription;
  await method({
    name,
    description: buildDescription({
      description: ielvDescription,
      locations: ielvLocations,
      facilities: ielvFacilities,
      services: ielvServices,
      restrictions: ielvRestrictions,
      rooms: ielvRooms,
    }),
    externalId,
  });

  // POST new bedrooms
  // TODO: Only post NEW bedrooms -- DO THIS NEXT (after description)
  await postBedrooms(externalId);

  return getProperty(externalId);
};
