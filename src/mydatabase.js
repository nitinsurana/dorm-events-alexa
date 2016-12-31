var q = require('q')
    , AWS = require("aws-sdk")
    , firebase = require('firebase');

var dynamoDBTableName = "events";

function MyDatabase(instanceType) {
    this.instanceType = instanceType;
    if (instanceType === 'firebase') {
        this.firebaseStorage = firebase.initializeApp({
            apiKey: "AIzaSyAqJpER21buRYXs-CMF_Ed2RespCp-h8rY",
            authDomain: "alexa-dorm-events.firebaseapp.com",
            databaseURL: "https://alexa-dorm-events.firebaseio.com",
            storageBucket: "alexa-dorm-events.appspot.com"
        });
    } else {
        AWS.config.update({
            region: "us-east-1",
            endpoint: "https://dynamodb.us-east-1.amazonaws.com"
        });
        this.docClient = new AWS.DynamoDB.DocumentClient();
    }
}

MyDatabase.prototype._setEventsDynamoDB = function (arr, accessToken) {
    console.log("Set Events (dynamoDB) accessToken : " + accessToken);
    arr.forEach(function (o) {
        if (o.start_time) {
            o.start_time = o.start_time.toISOString();
        }
    });
    this.docClient.put({
        TableName: dynamoDBTableName,
        Item: {
            "events": arr,
            "token": accessToken
        }
    }, function (err, data) {
        if (err) {
            console.error("Unable to add item", ". Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("PutItem succeeded:");
        }
    });
};

MyDatabase.prototype._getEventsDynamoDB = function (accessToken) {
    console.log("Get Events (dynamoDB) accessToken : " + accessToken);
    var defer = q.defer();
    this.docClient.get({
        TableName: dynamoDBTableName,
        Key: {
            "token": accessToken
        }
    }, function (err, data) {
        if (err) {
            console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
            defer.resolve([]);
        } else {
            var eventsArr = (data.Item && data.Item.events) || [];
            eventsArr.forEach(function (o) {
                if (o.start_time) {
                    o.start_time = new Date(o.start_time);
                }
            });
            defer.resolve(eventsArr);
        }
    });
    return defer.promise;
};

MyDatabase.prototype._setEventsFirebase = function (arr, accessToken) {
    console.log("Set Events (firebase) accessToken : " + accessToken);
    this.firebaseStorage.database().ref('events/' + accessToken).set({
        events: arr
    }, function (err) {
        if (err) {
            console.err("Error storing to firebase " + err);
        }
    });
    console.debug("Inside set events " + arr.length);
};

MyDatabase.prototype._getEventsFirebase = function (accessToken) {
    console.log("Get Events (firebase) accessToken : " + accessToken);
    var ref = this.firebaseStorage.database().ref('events/' + accessToken);
    var defer = q.defer();
    ref.once('value').then(function (snapshot) {
        defer.resolve(snapshot.val().events || []);
    });
    return defer.promise;
};

MyDatabase.prototype.setEvents = function (arr, accessToken) {
    if (this.instanceType === 'firebase') {
        return this._setEventsFirebase(arr, accessToken);
    } else {
        return this._setEventsDynamoDB(arr, accessToken);
    }
};

MyDatabase.prototype.getEvents = function (accessToken) {
    if (this.instanceType === 'firebase') {
        return this._getEventsFirebase(accessToken);
    } else {
        return this._getEventsDynamoDB(accessToken);
    }
};

module.exports = MyDatabase;