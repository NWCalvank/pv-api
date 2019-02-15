import convert from 'xml-to-json-promise';
import dotenv from 'dotenv';

import { myVRClient, ielvClient } from './api/client';

dotenv.config();

export const getAllProperties = () =>
  ielvClient
    .get('/villas.xml')
    .then(({ data }) => convert.xmlDataToJSON(data))
    .then(({ ielv: { villa } }) => villa)
    .catch(console.log);

export const getPropertyDetails = id =>
  ielvClient
    .get(`/villas.xml/${id}`)
    .then(({ data }) => convert.xmlDataToJSON(data))
    .then(
      ({
        ielv: {
          villa: [property],
        },
      }) => property
    )
    .catch(console.log);

export const updateProperty = ({
  id: [ielvId],
  title: [name],
  description: [ielvDescription],
}) => {
  const externalId = `IELV_${ielvId}`;
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

// TODO: Possibly export and add coverage
const getAllPropertyDetails = properties =>
  Promise.all(properties.map(({ id: [ielvId] }) => getPropertyDetails(ielvId)));

export default function(req, res) {
  if (req.header('Authorization') !== process.env.MY_VR_API_KEY) {
    const reason = 'Invalid Authorization header';
    // HTTP Response for incoming request
    res.send({ status: 401, status_message: 'Unauthorized', message: reason });

    // Promise response for function invocation
    return Promise.reject(new Error(reason));
  }

  // HTTP Response for incoming request
  res.send({
    status: 200,
    status_message: 'OK',
    message: 'Function IELV successfully invoked',
  });

  // Promise response for function invocation
  // TODO: POST/PUT to MyVR test property
  return getAllProperties().then(getAllPropertyDetails);
  // .then(updateAllProperties);
}
