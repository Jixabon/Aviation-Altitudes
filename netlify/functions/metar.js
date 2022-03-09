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
      switch (name) {
        case 'quality_control_flags':
          metars[name] = value.reduce((flags, item) => {
            let props = Object.entries(item).reduce((props, [name, value]) => {
              props[name] = value[0];

              return props;
            }, {});
            return { ...flags, ...props };
          }, {});
          break;

        case 'sky_condition':
          metars[name] = value.map((item) =>
            Object.entries(item).reduce(
              (nested, [name, value]) => {
                if (name == '$') {
                  nested = { ...nested, ...value };
                } else {
                  nested[name] = value[0];
                }

                return nested;
              },
              typeof item === 'object' ? {} : ''
            )
          );
          break;

        default:
          metars[name] = value[0];
          break;
      }

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
