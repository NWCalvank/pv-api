import convert from 'xml-to-json-promise';

import { ielvClient } from '../api/client';

export default () =>
  ielvClient
    .get('/villas.xml')
    .then(({ data }) => convert.xmlDataToJSON(data))
    .then(({ ielv: { villa } }) => villa)
    .catch(console.log);
