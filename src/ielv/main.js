import dotenv from 'dotenv';

import { logError } from '../util/logger';
import getAllProperties from './getAllProperties';
import getPropertyDetails from './getPropertyDetails';
import updateProperty from './updateProperty';

dotenv.config();

const getAllPropertyDetails = properties =>
  Promise.all(properties.map(({ id: [ielvId] }) => getPropertyDetails(ielvId)));

const updateAllProperties = properties =>
  Promise.all(properties.map(updateProperty));

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
  return getAllProperties()
    .then(getAllPropertyDetails)
    .then(updateAllProperties)
    .catch(logError);
}
