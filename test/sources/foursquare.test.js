/*!
 * kin
 * Copyright(c) 2016-2017 Benoit Person
 * Apache 2.0 Licensed
 */

const bluebird = require("bluebird");
const chai = require("chai");
const chai_as_promised = require("chai-as-promised");
const nock = require("nock");
const moment = require("moment");

const errors = require("../../src/api_server/errors");
const foursquare_actions = require("../../src/api_server/sources/foursquare/actions");
const { FOURSQUARE_API_BASE_URL, FOURSQUARE_API_VERSION, FoursquareRequest } = require("../../src/api_server/sources/foursquare/base");

const { create_stubs } = require("../stubs");

const expect = chai.expect;
chai.use(chai_as_promised);

describe("Foursquare", function() {
    beforeEach(function() {
        this.stubs = create_stubs();
    });

    describe("request", function() {
        it("disconnects source when unauthorized", function() {
            const stub_reply = {
                errors: [
                    {
                        code: "auth_fail",
                        message: "Invalid oauth credentials"
                    }
                ]
            };
            // TODO: add tests where we try to refresh token?
            this.stubs.user.should_refresh.returns(bluebird.resolve(1));

            nock(FOURSQUARE_API_BASE_URL).get("/test").query(true).times(2).reply(401, stub_reply);

            const req_promise = new FoursquareRequest(this.stubs.req, this.stubs.source.id, {
                backoff_delay: 1,
                max_backoff_attempts: 2
            }).api("test", {}, 0);
            return expect(req_promise).to.be.rejectedWith(errors.KinDisconnectedSourceError);
        });
    });

    describe("actions", function() {
        describe("#load_layers", function() {
            it("eventually returns a list of layers", function() {
                const promise = foursquare_actions.load_layers(this.stubs.req, this.stubs.source);
                return expect(promise).to.eventually.deep.equal([
                    {
                        id: "kin-1234:places_checked_in",
                        title: "Places I've Checked in",
                        color: '#0732a2',
                        text_color: '#FFFFFF',
                        acl: {
                            edit: false,
                            create: false,
                            delete: false
                        },
                        selected: true
                    }
                ]);
            });
        });

        describe("#load_events", function() {
            // https://developer.foursquare.com/docs/api/users/checkins
            it("eventually returns a list of events", function() {
                const layer_id = "kin-1234:places_checked_in";
                nock(FOURSQUARE_API_BASE_URL)
                    .get("/users/self/checkins")
                    .query({
                        oauth_token: "youShallPassAccessToken",
                        v: FOURSQUARE_API_VERSION
                    })
                  .reply(200, {
                      response: {
                          checkins: {
                              items: [
                                  {
                                      id: "alpha",
                                      name: "Alpha",
                                      venue: {
                                          name: "Alpha",
                                          location: {
                                              address: "Paris, France"
                                          }
                                      },
                                      description: "<p>Alpha description</p>",
                                      link: "https://foursquare.com/v/alpha/",
                                      createdAt: moment.tz('2016-10-10T00:00:00Z', 'utc').unix(),
                                      timeZoneOffset: 0
                                  }
                              ]
                          }
                      }
                  });

                return expect(
                    foursquare_actions.load_events(this.stubs.req, this.stubs.source, layer_id) // eslint-disable-line comma-dangle
                ).to.eventually.deep.equal({
                    events: [
                        {
                            id: "kin-1234:places_checked_in:alpha",
                            title: "Alpha",
                            description: "",
                            link: "https://foursquare.com/self/checkin/alpha",
                            location: "Paris, France",
                            kind: "event#basic",
                            start: {
                                date_time: "2016-10-10T03:00:00"
                            },
                            end: {
                                date_time: "2016-10-10T03:45:00"
                            }
                        }
                    ]
                });
            });
        });
    });

    afterEach(function() {
        // Make sure we don't leak nock interceptors to the next test
        nock.cleanAll();
    });
});
