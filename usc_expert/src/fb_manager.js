var https = require('https');
var q = require('q');
var request = require('request-promise');

function FbManager(accessToken) {
    this.accessToken = accessToken;
}
FbManager.prototype.getAllEvents = function () {
    var promises = [];
    promises.push(request('https://graph.facebook.com/me/events?type=not_replied&access_token=' + this.accessToken));
    promises.push(request('https://graph.facebook.com/me/events?&access_token=' + this.accessToken));

    var defer = q.defer();
    q.all(promises).then(function (arr) {
        arr[0] = JSON.parse(arr[0]);
        arr[1] = JSON.parse(arr[1]);
        var result = [];
        result.push(arr[0].data);
        result.push(arr[1].data);
        defer.resolve(result);
    });
    return defer.promise;
};

module.exports = FbManager;