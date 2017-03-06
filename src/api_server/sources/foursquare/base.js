const nuddles = require('nuddles');
const secrets = require('../../secrets');
const { STATIC_HOSTNAME, logger } = require('../../config');

const client = new nuddles.Client({
    clientId: secrets.get('FOURSQUARE_CLIENT_ID'),
    clientSecret: secrets.get('FOURSQUARE_CLIENT_SECRET'),
    redirectUri: `https://${STATIC_HOSTNAME}`
});
