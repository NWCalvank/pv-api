import { gcpClient } from './client';

export const triggerFetchDetails = (propertyKeys, callbackURL) =>
  gcpClient.post('/ielvFetchDetails', { propertyKeys, callbackURL });

export const triggerUpdateProperty = propertyKeys => propertyDetails =>
  gcpClient.post('/ielvUpdateProperty', { propertyKeys, propertyDetails });

export const triggerUpdateAvailability = propertyKeys => propertyDetails =>
  gcpClient.post('/ielvUpdateAvailability', { propertyKeys, propertyDetails });

export const triggerUpdateRates = propertyKeys => propertyDetails =>
  gcpClient.post('/ielvUpdateRates', { propertyKeys, propertyDetails });
