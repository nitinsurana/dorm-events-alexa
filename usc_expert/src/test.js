var q = require('q')
    , firebase = require('firebase')
    , moment = require('moment')
    , fbManager = require('../src/fb_manager');

var firebaseStorage = firebase.initializeApp({
    apiKey: "AIzaSyAqJpER21buRYXs-CMF_Ed2RespCp-h8rY",
    authDomain: "alexa-dorm-events.firebaseapp.com",
    databaseURL: "https://alexa-dorm-events.firebaseio.com",
    storageBucket: "alexa-dorm-events.appspot.com",
    messagingSenderId: "102471034173"
});

var accessToken = "EAAJZAbxXrAugBAHFDJqiB6NducoAPUNNflV8l51n2Gcg8oYrp0bJPC93rwMXLTOz0sOyqcQXXkynSLcdq1W0H8NjgfducvRs96EZAp1xv4rtVLCR3za9JonUBhUpZBx4Vve9qo60lN9bFwCX5STwtY4ZAMFqqdUZD";
var fb = new fbManager(accessToken);
var session = {
    user: {
        'accessToken': accessToken
    }
};
var response = {
    ask: function (s) {
        console.log(s);
    },
    tell: function (s) {
        console.log(s);
    }
};
// var p = fb.getAllEvents();
// p.then(function (arr) {
//     console.log("Setting events...");
//     try {
//         firebaseStorage.database().ref('events/' + accessToken).set({
//             events: arr
//         }, function (err) {
//             console.log("Callback completed : " + err);
//             firebaseStorage.delete();
//         });
//     } catch (e) {
//         console.log(e);
//     }
//     console.log("Inside set events " + arr.length);
// });
function setEvents(arr, session) {
    var accessToken = session.user.accessToken;
    console.log("Set Events accessToken : " + accessToken);
    firebaseStorage.database().ref('events/' + accessToken).set({
        events: arr
    }, function (err) {
        if (err) {
            console.err("Error storing to firebase " + err);
        }
        firebaseStorage.delete();
    });
    console.log("Inside set events " + arr.length);
}

function upcoming() {
    var self = this;
    console.log('Searching for next upcoming ');
    var p = fb.getAllEvents();
    p.then(function (arr) {
        console.log("Setting events...");
        var events = fb.findEvents(new Date(), moment().add(1, 'years').toDate());
        setEvents(events, session);
        console.log(events);
        if (events && events.length) {
            response.ask("Total " + events.length + " events found. First one is " + events[0].name);
        } else {
            response.tell("Sorry, no events found");
        }
    });
}

upcoming();