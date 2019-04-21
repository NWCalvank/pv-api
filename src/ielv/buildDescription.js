const htmlList = (items = [], title) => `
${items.length > 0 ? `<br/><div><strong>${title}</strong></div>` : ''}
<div>
<ul>${items.length > 0 ? '<li>' : ''}
${items
  .map(
    obj =>
      (obj[title.toLowerCase()] &&
        obj[title.toLowerCase()].join('</li><li>')) ||
      ''
  )
  .join('</li><li>')}
${items.length > 0 ? '</li>' : ''}</ul>
</div>
`;

const htmlNoList = (items = [], title) => `
${items
  .map(obj => obj[title.toLowerCase()] && obj[title.toLowerCase()].join('<br>'))
  .join('') || ''}
`;

const bookWithUsHTML = `
<div><b>WHY BOOK YOUR STAY WITH US?&nbsp;</b></div><div><b><br></b><ul><li>Private check-in </li><li>Pre-trip planning: airport transfers, grocery pre-stocking, activity suggestions</li><li>Fresh Linens, Towels, Daily Housekeeping (except Sundays)&nbsp;</li><li>English speaking concierge service and on location team </li><li>Free Wifi</li><li>Points Program (Inquire about our PersonalVillas rewards program if you visit often!)</li></ul></div><div><strong><br></strong></div>
`;

const nameAndLocationHTML = (name, locations) =>
  `
<div>
<b>${(name && `${name},`) || ''}</b>
<strong> </strong>
${(locations[0] && locations[0].location && locations[0].location[0]) ||
    ''}&nbsp;
</div>
`;

const roomsHTML = (bedrooms, { header, list } = {}) =>
  bedrooms
    .map(
      ({
        $: { type, index },
        view = [],
        bed_size: bedSize = [],
        equipment = [],
        equipped_for: equippedFor = [],
        other = [],
      }) =>
        `
${header || `${type} ${index}<br>`}
${list ? '<ul>' : ''}

${view[0] && list ? '<li>' : ''}
${(view[0] && `view: ${view[0]}<br>`) || ''}
${view[0] && list ? '</li>' : ''}

${bedSize[0] && list ? '<li>' : ''}
${(bedSize[0] && `bed_size: ${bedSize[0]}<br>`) || ''}
${bedSize[0] && list ? '</li>' : ''}

${equippedFor[0] && list ? '<li>' : ''}
${(equippedFor[0] && `equipped_for: ${equippedFor[0]}<br>`) || ''}
${equippedFor[0] && list ? '</li>' : ''}

${equipment[0] && list ? '<li>' : ''}
${(equipment[0] && `equipment: ${equipment[0]}<br>`) || ''}
${equipment[0] && list ? '</li>' : ''}

${other[0] && list ? '<li>' : ''}
${(other[0] &&
          `other: ${other[0]
            .replace(/\n/g, ' ')
            .replace(/\s\s\*/g, ',')
            .replace(/\s\*/g, ',')
            .replace(/\*/g, '')}<br>`) ||
          ''}
${other[0] && list ? '</li>' : ''}
${list ? '</ul>' : ''}
`
    )
    .join('');

export default ({
  name = '',
  description = '',
  locations = [],
  pools = [],
  facilities = [],
  services = [],
  restrictions = [],
  bedrooms = [],
  kitchen = [],
  livingRoom = [],
}) => `
${bookWithUsHTML}

${nameAndLocationHTML(name, locations)}

<div><br></div>

<div>${description}</div>

</div><div><br></div><div><b>AMENITIES:&nbsp;</b></div><div>
${htmlNoList(facilities, 'Facility')}
${htmlNoList(services, 'Service')}
</div>

${
  pools[0] &&
  pools[0].pool &&
  pools[0].pool.length > 0 &&
  pools[0].pool.some(({ description: [text] }) => text.length > 0)
    ? `<div>Pools</div>
<div>
${pools[0].pool
        .filter(({ description: [text] }) => text.length > 0)
        .map(({ description: [text] }) => text)
        .join('<br>')}
</div>
`
    : ''
}


<div><br></div><div><b>BEDROOMS:&nbsp;</b></div>
${roomsHTML(bedrooms)}

${roomsHTML(kitchen, {
  header: '<div><br></div><div><b>Kitchen&nbsp;</b></div>',
})}

${htmlList(restrictions, 'Restriction')}

${roomsHTML(livingRoom, {
  header: '<div><strong>Living room</strong></div>',
  list: true,
})}

<div><b>Location</b><br>
${htmlNoList(locations, 'Location')}

`;
