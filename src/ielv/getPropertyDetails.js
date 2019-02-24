import convert from 'xml-to-json-promise';

import { ielvClient } from '../api/client';
import { log } from '../util/logger';

export default id =>
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
    .catch(log);
