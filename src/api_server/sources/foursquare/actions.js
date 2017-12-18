const { FoursquareRequest, FOURSQUARE_DEFAULT_EVENT_DURATION } = require('./base');
const { merge_ids } = require('../../utils');


const bluebird = require('bluebird');
const moment = require('moment-timezone');
const _ = require('lodash');

const DATE_TIME_FORMAT = "YYYY-MM-DDTHH:mm:ss";

function _format_checkin(layer_id, checkin) {
    const output = {
        id: merge_ids(layer_id, checkin.id),
        title: checkin.venue.name,
        location: checkin.venue.location.address,
        description: '',
        link: `https://foursquare.com/self/checkin/${checkin.id}`,
        kind: 'event#basic',
    };

    const startTimeUTC = checkin.createdAt;
    output.start = {
        date_time: moment(startTimeUTC, 'X').format(DATE_TIME_FORMAT),
    };
    const endTimeUTC = startTimeUTC + FOURSQUARE_DEFAULT_EVENT_DURATION;
    output.end = {
        date_time: moment(endTimeUTC, 'X').format(DATE_TIME_FORMAT),
    };

    return output;
}

/**
 * Actions
 */
function load_layers(req, source) {
    return bluebird.resolve([
        {
            id: merge_ids(source.id, 'places_checked_in'),
            title: "Places I've Checked in",
            color: '#0732a2',
            text_color: '#FFFFFF',
            acl: {
                edit: false,
                create: false,
                delete: false,
            },

            // used as a default coming from the source,
            // it's overridden by our custom selected layer db
            selected: true,
        },
    ]);
}


function load_events(req, source, layer_id) {
    return new FoursquareRequest(req, source.id)
        .api('users/self/checkins')
        .then((foursquare_res) => { // eslint-disable-line arrow-body-style
            return {
                events: _.map(
                  foursquare_res.response.checkins.items,
                  _.partial(_format_checkin, layer_id)
                ),
            };
        });
}


module.exports = {
    load_layers,
    load_events,
};
