import { myVRClient } from '../api/client';

export const NOT_FOUND = 'Not Found';

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
  let property = await getProperty(externalId);

  if (property === NOT_FOUND) {
    // POST new property
    // TODO: implement
    // property = myVRClient.post()
  }

  // PUT all details (sans bedrooms) into main description section
  const description = putDescription({
    name,
    description: ielvDescription,
    externalId,
  });

  // POST new bedrooms
  const bedrooms = postBedrooms(externalId);

  return Promise.all([description, bedrooms]);
};
