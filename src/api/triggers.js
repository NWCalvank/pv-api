import { gcpClient } from './client';

export const triggerFetchDetails = propertyKeys =>
  gcpClient.post('/ielvFetchDetails', { propertyKeys });

export const triggerUpdateProperty = propertyKeys => propertyDetails =>
  gcpClient.post('/ielvUpdateProperty', { propertyKeys, propertyDetails });
