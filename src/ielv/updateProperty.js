import { myVRClient } from '../api/client';

export const NOT_FOUND = 'Not Found';

export const buildDescription = ({
  description,
  locations,
  facilities,
  services,
  restrictions,
  rooms,
}) => `
Summary
${description}

Location
${locations.map(({ location }) => location.join('\n')).join('\n')}

Facilities
${facilities.map(({ facility }) => facility.join('\n')).join('\n')}

Services
${services.map(({ service }) => service.join('\n')).join('\n')}

Restrictions
${restrictions.map(({ restriction }) => restriction.join('\n')).join('\n')}

${rooms
  .map(room =>
    Object.entries(room)
      .map(
        ([key, value]) =>
          key === '$'
            ? `\n${value.type} ${value.index === '1' ? '' : value.index}`
            : `${key}: ${value[0]}`
      )
      .join('\n')
  )
  .join('\n')}
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
    .catch(console.log);

export default async ({
  id: [ielvId],
  title: [name],
  description: [ielvDescription],
}) => {
  const externalId = `IELV_${ielvId}`;

  // GET property current details
  const property = await getProperty(externalId);

  // POST new property or PUT existing
  const method = property === NOT_FOUND ? postProperty : putDescription;
  await method({
    name,
    description: ielvDescription,
    externalId,
  });

  // POST new bedrooms
  // TODO: Only post NEW bedrooms
  await postBedrooms(externalId);

  return getProperty(externalId);
};
