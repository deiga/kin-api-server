/*!
 * kin
 * Copyright(c) 2016-2017 Benoit Person
 * Apache 2.0 Licensed
 */


const { FOURSQUARE_API_TIMEOUT } = require('./base');
const { deauth_source, save_source, send_home_redirects } = require('../source');
const { logger, rp } = require('../../config');
const secrets = require('../../secrets');
const { ensured_logged_in, get_callback_url, get_static_url, split_source_id } = require('../../utils');

const express = require('express');
const passport = require('passport');
const FoursquareStrategy = require('passport-foursquare').Strategy;
const _ = require('lodash');


const router = express.Router(); // eslint-disable-line new-cap
const source_redirect_url = get_callback_url('foursquare');


passport.use('foursquare-source', new FoursquareStrategy({
    clientID: secrets.get('FOURSQUARE_CLIENT_ID'),
    clientSecret: secrets.get('FOURSQUARE_CLIENT_SECRET'),
    callbackURL: source_redirect_url,
    passReqToCallback: true,
}, save_source));


router.get(
    '/',
    ensured_logged_in,
    passport.authorize('foursquare-source', {})
);


router.get(
    '/callback',
    ensured_logged_in,
    passport.authorize('foursquare-source', {
        failureRedirect: get_static_url(),
    }),
    send_home_redirects
);


router.get(
    '/deauth/:source_id*',
    ensured_logged_in,
    (req, res, next) => {
        const source_id = req.params.source_id;
        const user = req.user;

        const source = user.get_source(source_id);
        if (_.isUndefined(source)) {
            res.status(404).json({
                msg: `bad source id: \`${source_id}\``,
            });
            next();
        } else {
            const { provider_user_id } = split_source_id(source_id);
            const options = {
                method: 'POST',
                uri: 'http://www.meetup.com/api/?method=grantOauthAccess',
                qs: {
                    method: 'grantOauthAccess',
                },
                form: {
                    arg_clientId: secrets.get('FOURSQUARE_CLIENT_INTERNAL_ID'),
                    arg_member: provider_user_id,
                    arg_grant: false,
                },
                json: true,
                timeout: FOURSQUARE_API_TIMEOUT,
            };
            rp(options)
                .then(() => {
                    logger.debug('%s revoked source `%s` for user `%s`',
                                 req.id, source_id, user.id);
                })
                .catch(next);
            deauth_source(req, source);
            next();
        }
    },
    send_home_redirects
);


module.exports = {
    router,
};
