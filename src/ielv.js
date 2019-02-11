import convert from 'xml-to-json-promise';
import dotenv from 'dotenv';

import { ielvClient } from './api/client';

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

// TODO: Possibly export and add coverage
const getAllPropertyDetails = properties =>
  Promise.all(properties.map(({ id: [ielvId] }) => getPropertyDetails(ielvId)));

export default function(req, res) {
  if (req.header('Authorization') !== process.env.IELV_API_KEY) {
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
  return getAllProperties().then(getAllPropertyDetails);
}
