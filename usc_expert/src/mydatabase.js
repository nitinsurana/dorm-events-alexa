var q = require('q')
    , firebase = require('firebase');

function MyDatabase(instanceType) {
    this.instanceType = instanceType;
    if (instanceType === 'firebase') {
        this.firebaseStorage = firebase.initializeApp({
            apiKey: "AIzaSyAqJpER21buRYXs-CMF_Ed2RespCp-h8rY",
            authDomain: "alexa-dorm-events.firebaseapp.com",
            databaseURL: "https://alexa-dorm-events.firebaseio.com",
            storageBucket: "alexa-dorm-events.appspot.com"
        });
    }
}

MyDatabase.prototype._setEventsFirebase = function (arr, accessToken) {
    console.log("Set Events accessToken : " + accessToken);
    this.firebaseStorage.database().ref('events/' + accessToken).set({
        events: arr
    }, function (err) {
        if (err) {
            console.err("Error storing to firebase " + err);
        }
    });
    console.log("Inside set events " + arr.length);
};

MyDatabase.prototype.setEvents = function (arr, accessToken) {
    if (this.instanceType === 'firebase') {
        return this._setEventsFirebase(arr, accessToken);
    }
};

MyDatabase.prototype.getEvents = function (accessToken) {
    var ref = this.firebaseStorage.database().ref('events/' + accessToken);
    var defer = q.defer();
    ref.once('value').then(function (snapshot) {
        defer.resolve(snapshot.val().events);
    });
    return defer.promise;
};

module.exports = MyDatabase;