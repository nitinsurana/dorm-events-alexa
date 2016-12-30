var q = require('q')
    , firebase = require('firebase')
    , fbManager = require('./fb_manager');

var firebaseStorage = firebase.initializeApp({
    apiKey: "AIzaSyAqJpER21buRYXs-CMF_Ed2RespCp-h8rY",
    authDomain: "alexa-dorm-events.firebaseapp.com",
    databaseURL: "https://alexa-dorm-events.firebaseio.com",
    storageBucket: "alexa-dorm-events.appspot.com",
    // messagingSenderId: "102471034173"
});

var accessToken = "EAAJZAbxXrAugBAIOj839fIZAKKJBnduDY0oNcY2T9Be3OkOfA7xm3XOjV5N56dniscZBZCGwElJjlfwyP4RrZBH3zPqfQcNc9Kz1KcXzLU5Nmbdi4JJ8uMAmO59Wioqn2DATBit2ZAbMVOsZCSeRNlv9O7TKLjPmpQZD";
var fb = new fbManager(accessToken);


var p = fb.getAllEvents();
p.then(function (arr) {
    console.log("Setting events...");
    try {
        firebaseStorage.database().ref('events/' + accessToken).set({
            events: arr
        }, function (err) {
            console.log("Callback completed : " + err);
            firebaseStorage.delete();
        });
    } catch (e) {
        console.log(e);
    }
    console.log("Inside set events " + arr.length);
});