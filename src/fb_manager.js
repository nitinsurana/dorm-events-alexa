var https = require('https');
var q = require('q');
var request = require('request-promise');

function FbManager(accessToken) {
    this.accessToken = accessToken;
    this.events = [];
}
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
        var st = r.start_time;
        if (st.getYear() >= startDate.getYear() && st.getMonth() >= startDate.getMonth() && st.getDate() >= startDate.getDate()
            && st.getYear() <= endDate.getYear() && st.getMonth() <= endDate.getMonth() && st.getDate() <= endDate.getDate()) {
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