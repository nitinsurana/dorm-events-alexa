'use strict';

var http = require('http')
    , AlexaSkill = require('./AlexaSkill')
    , APP_ID = 'amzn1.ask.skill.789b89ef-790a-4002-b17b-5da0e3036248'
    , moment = require('moment')
    , request = require('request')
    , q = require('q')
    , myDatabase = new (require('./mydatabase'))('dynamoDB')
    , fbManager = require('./fb_manager');

var dateOutOfRange = "Sorry, could not understand the date. ";
var noAccessToken = "Your facebook integration is broken, please disable and then re-enable this skill in your Alexa app.";
var welcomeMessage = "Welcome to Dorm Events. It can tell you all about upcoming events, <break time=\"1ms\"/> their location  <break time=\"1ms\"/> and timing.";
var eventOutOfRange = "Event number is out of range please choose another event";
var repeatMessage = ". Would you like me to repeat ?";
var shutdownMessage = "Ok see you again soon.";
var helpPrimaryMessage = "What <break time=\"1ms\"/> would you like to know about <break time=\"2ms\"/>" +
    "Number one Events happening <break time=\"1ms\"/>" +
    "Number two their description <break time=\"1ms\"/>" +
    "Number three location <break time=\"1ms\"/>" +
    "Number four timing <break time=\"1ms\"/>" +
    "You can also say, stop, if you're done. " +
    "So, how can I help ?";
var helpHappeningMessage = "Here are some things you can ask : " +
    "what are the upcoming events <break time=\"1ms\"/>" +
    "whats happening today <break time=\"1ms\"/>" +
    "whats happening next week <break time=\"1ms\"/>" +
    "whats happening this weekend. " +
    repeatMessage;
var helpDescribeMessage = "Here are some things you can ask : " +
    " Describe event two <break time=\"1ms\"/>" +
    "What is event two <break time=\"1ms\"/>" +
    "what is event two about. " +
    repeatMessage;
var helpPlaceMessage = "Here are some things you can ask : " +
    "where is the event two happening <break time=\"1ms\"/>" +
    "where is the event two being held. " +
    repeatMessage;
var helpTimeMessage = "Here are some things you can ask : " +
    "when is the event two <break time=\"1ms\"/>" +
    "at what time event two is happening <break time=\"1ms\"/>" +
    "tell me the time of event two <break time=\"1ms\"/>" +
    "at what time event two starts " +
    repeatMessage;
var hearMore = ". Would you like to hear the next event ? ";


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
    this.hasToken(null, session, response).then((function () {
        var speechOutput = {
            speech: "<speak>" + welcomeMessage + "</speak>",
            type: AlexaSkill.speechOutputType.SSML
        };
        response.ask(speechOutput, speechOutput);

        console.log("onLaunch requestId: " + launchRequest.requestId
            + ", sessionId: " + session.sessionId);
    }).bind(this, null, session, response));
};

MyObject.prototype.hasToken = function (intent, session, response) {
    var defer = q.defer();
    var token = session.user.accessToken;
    if (token) {
        this.getFBManager(session).hasAppropriatePermissions().then(function () {
            defer.resolve();
        }).fail(function (err) {
            console.log("Token present but permission expired or not enough permissions");
            console.log(err);
            if (err === 'not-enough-permissions') {
                console.log("User does not have either the account linked or have not given appropriate permissions");
                response.tellWithLinkAccountCard('Your linked Facebook account have not given enough permissions. Please use the Alexa App to disable and then re-enable the skill and this time make sure to give permissions.');
                defer.reject();
            } else {
                response.tellWithLinkAccountCard('Your Facebook account is not linked. Please use the Alexa App to link the account and make sure to give event permissions.');
                defer.reject();
            }
        });
    } else {
        response.tellWithLinkAccountCard('Your Facebook account is not linked. Please use the Alexa App to link the account and make sure to give event permissions.');
        defer.reject();
    }
    return defer.promise;
};

MyObject.prototype.intentHandlers = {
    "AMAZON.RepeatIntent": function (intent, session, response) {
        if (session.attributes.speak === 'help' && session.attributes.repeat) {
            var repeat = session.attributes.repeat;
            delete session.attributes.repeat;
            this.intentHandlers[repeat].call(this, intent, session, response);
        } else {
            response.tell("Sorry, there is no help message to repeat.");
        }
    },
    "AMAZON.NoIntent": function (intent, session, response) {
        session.attributes = {};        //Remove all session attributes
        response.tell(shutdownMessage);
    },
    "AMAZON.StopIntent": function (intent, session, response) {
        this.intentHandlers["AMAZON.NoIntent"].call(this, intent, session, response);
    },
    "AMAZON.CancelIntent": function (intent, session, response) {
        this.intentHandlers["AMAZON.NoIntent"].call(this, intent, session, response);
    },
    "AMAZON.YesIntent": function (intent, session, response) {
        if (session.attributes.speak === "event" && session.attributes.lastEventIndex >= 0) {
            this.intentHandlers["nextEventIntent"].call(this, intent, session, response);
            // } else if (session.attributes.speak === 'help') {
        } else {
            this.intentHandlers["AMAZON.RepeatIntent"].call(this, intent, session, response);
        }
    },
    "AMAZON.HelpIntent": function (intent, session, response) {
        return this.intentHandlers.helpIntent(intent, session, response);
    },
    "helpIntent": function (intent, session, response) {
        session.attributes.speak = "help";
        var speechOutput = {
            speech: "<speak>" + helpPrimaryMessage + "</speak>",
            type: AlexaSkill.speechOutputType.SSML
        };
        response.ask(speechOutput, speechOutput);
    },
    "helpIntentHappening": function (intent, session, response) {
        session.attributes.speak = "help";
        session.attributes.repeat = "helpIntentHappening";
        var speechOutput = {
            speech: "<speak>" + helpHappeningMessage + "</speak>",
            type: AlexaSkill.speechOutputType.SSML
        };
        response.ask(speechOutput, speechOutput);
    },
    "helpIntentDescribe": function (intent, session, response) {
        session.attributes.speak = "help";
        session.attributes.repeat = "helpIntentDescribe";
        var speechOutput = {
            speech: "<speak>" + helpDescribeMessage + "</speak>",
            type: AlexaSkill.speechOutputType.SSML
        };
        response.ask(speechOutput, speechOutput);
    },
    "helpIntentPlace": function (intent, session, response) {
        session.attributes.speak = "help";
        session.attributes.repeat = "helpIntentPlace";
        var speechOutput = {
            speech: "<speak>" + helpPlaceMessage + "</speak>",
            type: AlexaSkill.speechOutputType.SSML
        };
        response.ask(speechOutput, speechOutput);
    },
    "helpIntentTime": function (intent, session, response) {
        session.attributes.speak = "help";
        session.attributes.repeat = "helpIntentTime";
        var speechOutput = {
            speech: "<speak>" + helpTimeMessage + "</speak>",
            type: AlexaSkill.speechOutputType.SSML
        };
        response.ask(speechOutput, speechOutput);
    },


    "upcomingIntent": function (intent, session, response) {
        var self = this;
        this.hasToken(intent, session, response).then((function () {
            console.log('Searching for next upcoming ');
            var fb = this.getFBManager(session);
            var p = fb.getAllEvents();
            p.then(function (arr) {
                console.log("Setting events...");
                var events = fb.findEvents(new Date(), moment().add(1, 'years').toDate());
                myDatabase.setEvents(events, session.user.accessToken);
                if (events && events.length) {
                    var msg = "Total " + events.length + " events found. Number one is, " + events[0].name;
                    session.attributes.speak = "event";
                    session.attributes.lastEventIndex = 0;
                    if (events.length > 1) {
                        msg += hearMore;
                        response.ask(msg, msg);
                    } else {
                        response.tell(msg);
                    }
                } else {
                    response.tell("Sorry, no events found");
                }
            });
        }).bind(this, intent, session, response));
    },
    "searchIntent": function (intent, session, response) {
        this.hasToken(intent, session, response).then((function () {
            var self = this;
            var slotValue = intent.slots.date.value;
            if (slotValue == undefined || slotValue == '') {
                this.intentHandlers["helpIntentHappening"].call(this, intent, session, response);
                return;
            }
            console.log('searchIntent for ' + slotValue);
            slotValue = getDateFromSlot(slotValue);
            var fb = this.getFBManager(session);

            if (slotValue.error) {
                response.tell(slotValue.error);
            } else {
                console.log('Searching between ' + slotValue.startDate + '     ' + slotValue.endDate);
                var p = fb.getAllEvents();
                p.then(function (arr) {
                    var events = fb.findEvents(slotValue.startDate, slotValue.endDate);
                    myDatabase.setEvents(events, session.user.accessToken);
                    console.log(events);
                    if (events && events.length) {
                        var msg = "Total " + events.length + " events found. Number one is, " + events[0].name;
                        session.attributes.speak = "event";
                        session.attributes.lastEventIndex = 0;
                        if (events.length > 1) {
                            msg += hearMore;
                            response.ask(msg, msg);
                        } else {
                            response.tell(msg);
                        }
                    } else {
                        response.tell("Sorry, no events found");
                    }
                });
            }
        }).bind(this, intent, session, response));
    },
    "nextEventIntent": function (intent, session, response) {
        this.hasToken(intent, session, response).then((function () {
            if (typeof session.attributes.lastEventIndex != 'undefined') {
                var index = session.attributes.lastEventIndex + 1;
                var promise = myDatabase.getEvents(session.user.accessToken);
                promise.then(function (relevantEvents) {
                    console.log("Next event (eventInfo) : " + relevantEvents.length);

                    if (relevantEvents[index]) {
                        // use the slot value as an index to retrieve description from our relevant array
                        var output = "Number " + (index + 1) + " event is, " + removeTags(relevantEvents[index].name);
                        session.attributes.speak = "event";
                        session.attributes.lastEventIndex = index;
                        if (index < relevantEvents.length - 1) {
                            output += hearMore;
                            response.askWithCard(output, relevantEvents[index].summary, output, output);
                        } else {
                            response.tell(output);
                        }
                    } else {
                        session.attributes.speak = undefined;
                        session.attributes.lastEventIndex = -1;
                        response.tell(eventOutOfRange);
                    }
                });
            } else {
                response.tell("There is no next event. You can use the phrase \"tell me about event three\" to know more about that event or ask for upcoming events.")
            }
        }).bind(this, intent, session, response));
    },
    "eventIntent": function (intent, session, response) {
        this.hasToken(intent, session, response).then((function () {
            var slotValue = intent.slots.number.value;

            // parse slot value
            var index = parseInt(slotValue) - 1;
            var promise = myDatabase.getEvents(session.user.accessToken);
            promise.then(function (relevantEvents) {
                console.log("Stored events (eventInfo) : " + relevantEvents);

                if (relevantEvents[index]) {
                    // use the slot value as an index to retrieve description from our relevant array
                    var output = "Event " + slotValue + ", " + removeTags(relevantEvents[index].name) + " is about " + removeTags(relevantEvents[index].description);
                    session.attributes.speak = "event";
                    session.attributes.lastEventIndex = index;
                    response.tellWithCard(output, relevantEvents[index].summary, output);
                } else {
                    session.attributes.speak = undefined;
                    session.attributes.lastEventIndex = -1;
                    response.tell(eventOutOfRange);
                }
            });
        }).bind(this, intent, session, response));
    },
    "whereIntent": function (intent, session, response) {
        this.hasToken(intent, session, response).then((function () {
            var slotValue = intent.slots.number.value;

            // parse slot value
            var index = parseInt(slotValue) - 1;
            var promise = myDatabase.getEvents(session.user.accessToken);
            var lastIndex = session.attributes.lastEventIndex;
            promise.then(function (relevantEvents) {
                console.log("Stored events (where) : " + relevantEvents.length + "   " + index);

                if (isNaN(index)) {
                    if (lastIndex >= 0 && lastIndex < relevantEvents.length && relevantEvents[lastIndex]) {
                        index = lastIndex;
                    }
                }
                if (relevantEvents[index]) {
                    // use the slot value as an index to retrieve description from our relevant array
                    var output = "The event, " + relevantEvents[index].name + " is at " + removeTags(relevantEvents[index].place.name) + " , ";
                    if (relevantEvents[index].place.location && relevantEvents[index].place.location.street) {
                        output += removeTags(relevantEvents[index].place.location.street) + ", "
                    }
                    if (relevantEvents[index].place.location && relevantEvents[index].place.location.city) {
                        output += removeTags(relevantEvents[index].place.location.city) + ", "
                    }
                    response.tellWithCard(output, relevantEvents[index].summary, output);
                } else {
                    session.attributes.speak = undefined;
                    session.attributes.lastEventIndex = -1;
                    response.tell(eventOutOfRange);
                }
            });
        }).bind(this, intent, session, response));
    },
    "whenIntent": function (intent, session, response) {
        this.hasToken(intent, session, response).then((function () {
            var slotValue = intent.slots.number.value;

            // parse slot value
            var index = parseInt(slotValue) - 1;
            var promise = myDatabase.getEvents(session.user.accessToken);
            var lastIndex = session.attributes.lastEventIndex;
            promise.then(function (relevantEvents) {
                console.log("Stored events (when) : " + relevantEvents.length + "     " + index);

                if (isNaN(index)) {
                    if (lastIndex >= 0 && lastIndex < relevantEvents.length && relevantEvents[lastIndex]) {
                        index = lastIndex;
                    }
                }

                if (relevantEvents[index]) {
                    // use the slot value as an index to retrieve description from our relevant array
                    var when = " is probably the complete day.";
                    console.log(relevantEvents[index].start_time);
                    if (relevantEvents[index].start_time) {   //not all events have a start time
                        when = " is on " + moment(relevantEvents[index].start_time).format('MMMM Do, h:mm a');
                    }
                    var output = "The event, " + relevantEvents[index].name + when;
                    response.tellWithCard(output, relevantEvents[index].summary, output);
                } else {
                    session.attributes.speak = undefined;
                    session.attributes.lastEventIndex = -1;
                    response.tell(eventOutOfRange);
                }
            });
        }).bind(this, intent, session, response));
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
    var monthRegex = new RegExp(/^\d{4}-\d{2}$/);

    // if could not parse data must be one of the other formats
    if (isNaN(date) || rawDate.match(monthRegex)) {      //year & month only date
        // to find out what type of date this is, we can split it and count how many parts we have see comments above.
        var res = rawDate.split("-");
        // if we have 2 bits that include a 'W' week number
        if (res.length === 2 && res[1].indexOf('W') > -1) {
            var dates = getWeekData(res);
            eventDate["startDate"] = new Date(dates.startDate);
            eventDate["endDate"] = new Date(dates.endDate);
        } else if (rawDate.match(monthRegex)) {
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
            eventDate["error"] = dateOutOfRange + " " + helpHappeningMessage;
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
