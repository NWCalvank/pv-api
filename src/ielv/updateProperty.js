import { myVRClient } from '../api/client';

export default ({
  id: [ielvId],
  title: [name],
  description: [ielvDescription],
}) => {
  const externalId = `IELV_${ielvId}`;
  // GET property current details

  // POST new properties? Is that possible?

  // PUT all details (sans bedrooms) into main description section
  const description = myVRClient
    .put(`/properties/${externalId}/`, {
      // required
      name,
      // relevant payload
      description: ielvDescription,
      // becomes null if not set explicitly
      externalId,
    })
    .then(({ data }) => data)
    .catch(console.log);

  // POST new bedrooms
  const bedrooms = myVRClient
    .post('/rooms/', {
      property: externalId,
    })
    .then(({ data }) => data)
    .catch(console.log);

  return Promise.all([description, bedrooms]);
};
