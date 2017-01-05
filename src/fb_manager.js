var https = require('https');
var q = require('q');
var request = require('request-promise');
var errors = require('request-promise/errors');
var moment = require('moment');

function FbManager(accessToken) {
    this.accessToken = accessToken;
    this.events = [];
}

FbManager.prototype.hasAppropriatePermissions = function () {
    "use strict";
    var defer = q.defer();
    var promise = request('https://graph.facebook.com/me/permissions?access_token=' + this.accessToken);
    promise
        .then(function (resp) {
            resp = JSON.parse(resp);
            var dec = resp.data.filter(function (ss) {
                return ss.status === 'declined';
            });
            if (dec.length) {
                defer.reject("not-enough-permissions");
            } else {
                defer.resolve();
            }
        })
        .catch(function (err) {
            var json = JSON.parse(err.response.body);
            console.log("Facebook connection error : ");
            console.log(json.error);
            if (json.error.message.indexOf('Error validating access token:') > -1) {
                defer.reject("invalid-token");
            } else {
                defer.reject("not-enough-permissions");
            }
        });
    return defer.promise;
};

FbManager.prototype.getAllEvents = function () {
    var self = this;
    var promises = [];
    promises.push(request('https://graph.facebook.com/me/events?type=attending&access_token=' + this.accessToken));
    promises.push(request('https://graph.facebook.com/me/events?type=created&access_token=' + this.accessToken));
    promises.push(request('https://graph.facebook.com/me/events?type=maybe&access_token=' + this.accessToken));
    promises.push(request('https://graph.facebook.com/me/events?type=not_replied&access_token=' + this.accessToken));

    //https://developers.facebook.com/docs/graph-api/reference/user/events/ - attending, created, declined, maybe, not_replied

    var defer = q.defer();
    q.all(promises).then(function (arr) {
        var results = [];
        for (var v in arr) {
            arr[v] = JSON.parse(arr[v]);
            results = results.concat(arr[v].data);
        }
        results.forEach(function (r) {
            r.start_time = new Date(r.start_time);
        });
        self.events = results;
        console.log("Found events : " + results.length);
        defer.resolve(results);
    });
    return defer.promise;
};

FbManager.prototype.findEvents = function (startDate, endDate) {
    var events = this.events.filter(function (r) {
        var b = moment(r.start_time).isBetween(startDate, endDate, 'days', 'days');
        if (b) {
            return true;
        }
        return false;
    });
    events.sort(function (a, b) {
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    });
    return events;
};
module.exports = FbManager;