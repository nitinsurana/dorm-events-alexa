'use strict';

var http = require('http')
    , AlexaSkill = require('./AlexaSkill')
    , APP_ID = 'amzn1.ask.skill.789b89ef-790a-4002-b17b-5da0e3036248'
    , moment = require('moment')
    , request = require('request')
    , q = require('q')
    , myDatabase = new (require('./mydatabase'))('dynamoDB')
    , fbManager = require('./fb_manager');

var dateOutOfRange = "Date is out of range please choose another date";
var noAccessToken = "Your facebook integration is broken, please disable and then re-enable this skill in your Alexa app.";
var welcomeMessage = "Welcome to Dorm Events. It can tell you all about upcoming events.";
var descriptionMessage = "Here's the description ";
var eventOutOfRange = "Event number is out of range please choose another event";

var MyObject = function () {
    AlexaSkill.call(this, APP_ID);
};


MyObject.prototype = Object.create(AlexaSkill.prototype);
MyObject.prototype.constructor = MyObject;

MyObject.prototype.getFBManager = function (session) {
    var accessToken = session.user.accessToken;
    return new fbManager(accessToken);
};

MyObject.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    response.ask(welcomeMessage);

    console.log("onLaunch requestId: " + launchRequest.requestId
        + ", sessionId: " + session.sessionId);
};

MyObject.prototype.intentHandlers = {
    HelpIntent: function (intent, session, response) {
        try {
            var accessToken = session.user.accessToken;
        } catch (e) {
            accessToken = e;
        }
        if (accessToken) {
            response.ask(welcomeMessage);
        }
        else {
            response.ask(noAccessToken);
        }
    },
    upcomingIntent: function (intent, session, response) {
        var self = this;
        console.log('Searching for next upcoming ');
        var fb = this.getFBManager(session);
        var p = fb.getAllEvents();
        p.then(function (arr) {
            console.log("Setting events...");
            var events = fb.findEvents(new Date(), moment().add(1, 'years').toDate());
            myDatabase.setEvents(events, session.user.accessToken);
            console.log(events);
            if (events && events.length) {
                response.ask("Total " + events.length + " events found. First one is " + events[0].name);
            } else {
                response.tell("Sorry, no events found");
            }
        });
    },
    searchIntent: function (intent, session, response) {
        var self = this;
        var slotValue = intent.slots.date.value;
        slotValue = getDateFromSlot(slotValue);
        var fb = this.getFBManager(session);

        if (slotValue.error) {
            response.tell(slotValue.error);
        } else {
            console.log('Searching for ' + intent.slots.date.value + "    " + slotValue.startDate + '     ' + slotValue.endDate);
            var p = fb.getAllEvents();
            p.then(function (arr) {
                var events = fb.findEvents(slotValue.startDate, slotValue.endDate);
                myDatabase.setEvents(events, session.user.accessToken);
                console.log(events);
                if (events && events.length) {
                    response.ask("Total " + events.length + " events found. First one is " + events[0].name);
                } else {
                    response.tell("Sorry, no events found");
                }
            });
        }

    },
    eventIntent: function (intent, session, response) {
        var reprompt = " Would you like to hear another event?";
        var slotValue = intent.slots.number.value;

        // parse slot value
        var index = parseInt(slotValue) - 1;
        var promise = myDatabase.getEvents(session.user.accessToken);
        promise.then(function (relevantEvents) {
            console.log("Stored events (eventInfo) : " + relevantEvents);

            if (relevantEvents[index]) {
                // use the slot value as an index to retrieve description from our relevant array
                var output = descriptionMessage + removeTags(relevantEvents[index].description);
                response.askWithCard(output, reprompt, relevantEvents[index].summary, output);
            } else {
                response.tell(eventOutOfRange);
            }
        });
    },
    whereIntent: function (intent, session, response) {
        var reprompt = " Would you like to hear another event?";
        var slotValue = intent.slots.number.value;

        // parse slot value
        var index = parseInt(slotValue) - 1;
        var promise = myDatabase.getEvents(session.user.accessToken);
        promise.then(function (relevantEvents) {
            console.log("Stored events (where) : " + relevantEvents.length);

            if (relevantEvents[index]) {
                // use the slot value as an index to retrieve description from our relevant array
                var output = "The event " + relevantEvents[index].name + " is at " + removeTags(relevantEvents[index].place.location.street) + " " + removeTags(relevantEvents[index].place.location.city);
                response.askWithCard(output, reprompt, relevantEvents[index].summary, output);
            } else {
                response.tell(eventOutOfRange);
            }
        });
    },
    whenIntent: function (intent, session, response) {
        var reprompt = " Would you like to hear another event?";
        var slotValue = intent.slots.number.value;

        // parse slot value
        var index = parseInt(slotValue) - 1;
        var promise = myDatabase.getEvents(session.user.accessToken);
        promise.then(function (relevantEvents) {
            console.log("Stored events (when) : " + relevantEvents);

            if (relevantEvents[index]) {
                // use the slot value as an index to retrieve description from our relevant array
                var when = " is probably the complete day."
                if (relevantEvents[index].start_time) {   //not all events have a start time
                    when = "is on " + moment(relevantEvents[index].start_time).format('MMMM Do, h:mm a').replace(':', ' ');
                }
                console.log("The event is at " + when);
                var output = "The event " + relevantEvents[index].name + when;
                response.askWithCard(output, reprompt, relevantEvents[index].summary, output);
            } else {
                response.tell(eventOutOfRange);
            }
        });
    }
};

function removeTags(str) {
    return str && str.replace(/<(?:.|\n)*?>/gm, '');
}

// Given an AMAZON.DATE slot value parse out to usable JavaScript Date object
// Utterances that map to the weekend for a specific week (such as �this weekend�) convert to a date indicating the week number and weekend: 2015-W49-WE.
// Utterances that map to a month, but not a specific day (such as �next month�, or �December�) convert to a date with just the year and month: 2015-12.
// Utterances that map to a year (such as �next year�) convert to a date containing just the year: 2016.
// Utterances that map to a decade convert to a date indicating the decade: 201X.
// Utterances that map to a season (such as �next winter�) convert to a date with the year and a season indicator: winter: WI, spring: SP, summer: SU, fall: FA)
function getDateFromSlot(rawDate) {
    // try to parse data
    var date = new Date(Date.parse(rawDate));
    var result;
    // create an empty object to use later
    var eventDate = {};

    // if could not parse data must be one of the other formats
    if (isNaN(date) || rawDate.match(/\d{4}-\d{2}/)) {      //year & month only date
        // to find out what type of date this is, we can split it and count how many parts we have see comments above.
        var res = rawDate.split("-");
        // if we have 2 bits that include a 'W' week number
        if (res.length === 2 && res[1].indexOf('W') > -1) {
            var dates = getWeekData(res);
            eventDate["startDate"] = new Date(dates.startDate);
            eventDate["endDate"] = new Date(dates.endDate);
        } else if (rawDate.match(/\d{4}-\d{2}/)) {
            var dates = getMonthData(res);
            eventDate["startDate"] = new Date(dates.startDate);
            eventDate["endDate"] = new Date(dates.endDate);
            // if we have 3 bits, we could either have a valid date (which would have parsed already) or a weekend
        } else if (res.length === 3) {
            var dates = getWeekendData(res);
            eventDate["startDate"] = new Date(dates.startDate);
            eventDate["endDate"] = new Date(dates.endDate);
            // anything else would be out of range for this skill
        } else {
            eventDate["error"] = dateOutOfRange;
        }
        // original slot value was parsed correctly
    } else {
        eventDate["startDate"] = new Date(date.setUTCHours(0, 0, 0, 0));
        eventDate["endDate"] = new Date(date.setUTCHours(24, 0, 0, 0));
    }
    return eventDate;
}

// Given a week number return the dates for both weekend days
function getWeekendData(res) {
    if (res.length === 3) {
        var saturdayIndex = 5;
        var sundayIndex = 6;
        var weekNumber = res[1].substring(1);

        var weekStart = w2date(res[0], weekNumber, saturdayIndex);
        var weekEnd = w2date(res[0], weekNumber, sundayIndex);

        return {
            startDate: weekStart,
            endDate: weekEnd
        };
    }
}

// Given a week number return the dates for both the start date and the end date
function getWeekData(res) {
    if (res.length === 2) {

        var mondayIndex = 0;
        var sundayIndex = 6;

        var weekNumber = res[1].substring(1);

        var weekStart = w2date(res[0], weekNumber, mondayIndex);
        var weekEnd = w2date(res[0], weekNumber, sundayIndex);

        return {
            startDate: weekStart,
            endDate: weekEnd
        };
    }
}

// Given a month number return the dates for both the start date and the end date
function getMonthData(res) {
    if (res.length === 2) {

        return {
            startDate: moment(res.join("-")).toDate(),
            endDate: moment(res.join("-")).add(1, 'month').subtract(1, 'days').toDate()
        };
    }
}


// Used to work out the dates given week numbers
var w2date = function (year, wn, dayNb) {
    var day = 86400000;

    var j10 = new Date(year, 0, 10, 12, 0, 0),
        j4 = new Date(year, 0, 4, 12, 0, 0),
        mon1 = j4.getTime() - j10.getDay() * day;
    return new Date(mon1 + ((wn - 1) * 7 + dayNb) * day);
};

exports.handler = function (event, context, callback) {
    var skill = new MyObject();
    skill.execute(event, context);
};
