'use strict';


var http = require('http')
    , AlexaSkill = require('./AlexaSkill')
    , APP_ID = 'amzn1.ask.skill.789b89ef-790a-4002-b17b-5da0e3036248';
var ical = require('ical');
var request = require('request');

var MyObject = function () {
    AlexaSkill.call(this, APP_ID);
};
MyObject.prototype = Object.create(AlexaSkill.prototype);
MyObject.prototype.constructor = MyObject;

MyObject.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    var output = "Welcome to USC Expert, I am here to vastly narrow down events of your interest.";

    response.ask(output);

    console.log("onLaunch requestId: " + launchRequest.requestId
        + ", sessionId: " + session.sessionId);
};

MyObject.prototype.intentHandlers = {
    ColloquiumToday: function (intent, session, response) {
        handleColloquiumToday(intent, session, response);
    },
    InterestedColloquiumToday: function (intent, session, response) {
        handleInterestedColloquiumToday(intent, session, response);
    },


    HelpIntent: function (intent, session, response) {
        // var speechOutput = 'You can ask me if there are colloquiums today or about events your friends are interested in.' +
        //     'For example, you can say, Are there any colloquiums today.';
        // response.ask(speechOutput);
        try {
            var accessToken = session.user.accessToken;
        } catch (e) {
            accessToken = e;
        }
        var welcomeMessage = "Found your access token, welcome!  " + accessToken;
        if (accessToken) {
            //     // FB.setAccessToken(accessToken);
            //     console.log("HAVE ACCESS TOKEN : " + accessToken);
            response.ask(welcomeMessage);
            //     // this.emit(':ask', welcomeMessage, welcomeMessage);
        }
        else {
            var noAccessToken = "Please link your facebook";
            //     var tryLaterText = "Something went wrong, please try again later";
            response.ask(noAccessToken);
            //     // this.emit(':tell', noAccessToken, tryLaterText);
        }
    },

    MyUpcomingFacebookEventsIntent: function (intent, session, response) {
        handleMyUpcomingFacebookEventsIntent(intent, session, response);
    }
};

var events = [
    {
        type: 'colloquium',
        title: 'Representations and Models for Collaboratively Intelligent Robots',
        presenter: 'Subramanian Ramamoorthy',
        location: 'SAL one zero one',
        date: 'today',
        time: "three thirty PM",
        friends: [
            {
                id: '',
                name: ''
            }
        ]
    },
    {
        type: 'colloquium',
        title: 'Learning with Low Samples in High-Dimensions: Estimators, Geometry, and Applications',
        presenter: 'Arindam Banerjee',
        location: 'SAL one zero one',
        date: 'today',
        time: "four PM",
        friends: [
            {
                id: '',
                name: ''
            },
            {
                id: '',
                name: ''
            },
            {
                id: '',
                name: ''
            }
        ]
    }
];

function handleMyUpcomingFacebookEventsIntent(intent, session, response) {
    var eventList = [], output;
    var URL = "http://www.facebook.com/ical/u.php?uid=1659106026&key=AQAg7TvEGtIJVguR";
    // ical.parseICS
    request({
        url: URL,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Node.js 6.0.0) MagicMirror/2.0 (https://github.com/MichMich/MagicMirror)'
        }
    }, function (error, res, data) {
        // console.log(icalData);
        // });
        // ical.fromURL(URL, {}, function (err, data) {
        // Loop through all iCal data found
        // console.log("Ical data before parsing");
        // console.log(data);
        // console.log(data);
        data = ical.parseICS(data);
        console.log(data);
        for (var k in data) {
            if (data.hasOwnProperty(k)) {
                var ev = data[k];
                // Pick out the data relevant to us and create an object to hold it.
                var eventData = {
                    summary: removeTags(ev.summary),
                    location: removeTags(ev.location),
                    description: removeTags(ev.description),
                    start: ev.start,
                    created: ev.created
                };
                // add the newly created object to an array for use later.
                eventList.push(eventData);
            }
        }
        var index = 0;

        // Check we have data
        if (eventList.length > 0) {
            var today = 20161116;
            eventList.forEach(function (e, i) {
                var created = parseInt(e.created.split("T")[0]);
                if (created > today) {
                    index = i;
                }
            });
            output = eventList[index].summary + " in " + eventList[index].location;
        } else {
            output = "There are no upcoming events";
        }
        response.tell(output);
    });
}

function removeTags(str) {
    return str && str.replace(/<(?:.|\n)*?>/gm, '');
}

function handleColloquiumToday(intent, session, response) {
    var arr = [];
    var numbers = ['one', 'two', 'three', 'four', 'five'];
    events.forEach(function (e, i) {
        if (arr.length <= 5) {
            if (e.date === 'today') {
                arr.push(numbers[i] + ' ' + e.title + ' by ' + e.presenter + ' at ' + e.time + ' in ' + e.locatio);
            }
        }
    });
    if (!arr.length) {
        response.tell("There are no colloquiums today");
    } else {
        response.tell(arr.join('. '));
    }
}

function handleInterestedColloquiumToday(intent, session, response) {
    var maxFriends = 0, output;
    events.forEach(function (e) {
        if (e.date === 'today' && e.friends && e.friends.length && maxFriends < e.friends.length) {
            maxFriends = e.friends.length;
            output = maxFriends + ' of your friends are going to ' + (e.title + ' by ' + e.presenter + ' at ' + e.time + ' in ' + e.location);
        }
    });
    if (!output) {
        response.tell("There are no colloquiums today");
    } else {
        response.tell(output);
    }
}

exports.handler = function (event, context, callback) {
    var skill = new MyObject();
    skill.execute(event, context);
};
