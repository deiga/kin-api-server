const _ = require('lodash');

const KinRequest = require('../kin_request');
const { logger } = require('../../config');

const FOURSQUARE_API_BASE_URL = 'https://api.foursquare.com/v2/';
const FOURSQUARE_API_VERSION = '20171217';
const FOURSQUARE_API_TIMEOUT = 4 * 1000;
const FOURSQUARE_DEFAULT_EVENT_DURATION = 45 * 60;

class FoursquareRequest extends KinRequest {
    constructor(req, source_id) {
        super(req, source_id, FOURSQUARE_API_BASE_URL);
    }

    api(uri, options = {}, attempt = 0) {
        return super
            .api(uri, options, attempt)
            .catch((err) => {
                logger.debug('Call to 4sq failed', err);
                throw err;
            });
    }

    api_request_options(access_token, overrides) {
        return _.merge({
            qs: {
                oauth_token: access_token,
                v: FOURSQUARE_API_VERSION
            },
            json: true,
            timeout: FOURSQUARE_API_TIMEOUT,
        }, overrides);
    }
}


module.exports = {
    FOURSQUARE_DEFAULT_EVENT_DURATION,
    FOURSQUARE_API_BASE_URL,
    FOURSQUARE_API_TIMEOUT,

    FoursquareRequest,
};
