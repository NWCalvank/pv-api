import dotenv from 'dotenv';

import apiClient from './api/client';

dotenv.config();

export default function(req, res) {
  if (req.header('Authorization') !== process.env.API_KEY) {
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
    message: 'Function first successfully invoked',
  });

  // Promise response for function invocation
  return apiClient.get('/properties/');
}
