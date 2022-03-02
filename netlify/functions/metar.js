const axios = require('axios').default;
const parseXML = require('xml2js').parseStringPromise;

const addsURL =
  'https://www.aviationweather.gov/adds/dataserver_current/httpparam';

exports.handler = async (event, context) => {
  var pathParts = event.path.split('/');
  var stationString = pathParts[pathParts.length - 1];

  var api = new URL(addsURL);
  api.searchParams.append('dataSource', 'metars');
  api.searchParams.append('requestType', 'retrieve');
  api.searchParams.append('format', 'xml');
  api.searchParams.append(
    'hoursBeforeNow',
    event.queryStringParameters.hoursBeforeNow || 5
  );
  api.searchParams.append('mostRecentForEachStation', true);
  api.searchParams.append('stationString', stationString);

  var requestHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/xml',
    host: api.host,
  };

  var options = {
    method: event.httpMethod.toUpperCase(),
    url: api.toString(),
    headers: requestHeaders,
    body: event.body,
  };

  var response = await axios(options);

  var json = await parseXML(response.data);

  var metars = json?.response?.data[0]?.METAR.map((metar) => {
    return Object.entries(metar).reduce((metars, [name, value]) => {
      metars[name] =
        typeof value[0] != 'object'
          ? value[0]
          : Object.entries(value[0]).reduce((nested, [name, value]) => {
              var attrs = null;
              if (name == '$') {
                attrs = Object.entries(value).reduce((attrs, [name, value]) => {
                  attrs[name] = value;

                  return attrs;
                }, {});

                nested = { ...nested, ...attrs };
              } else {
                nested[name] = value[0];
              }

              return nested;
            }, {});

      return metars;
    }, {});
  });

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metars),
  };
};
