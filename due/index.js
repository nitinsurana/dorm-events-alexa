
// Alexa SDK for JavaScript v1.0.00
// Copyright (c) 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved. Use is subject to license terms.
'use strict';
function AlexaSkill(appId) {
    this._appId = appId;
}

AlexaSkill.prototype.requestHandlers = {
    LaunchRequest: function (event, context, response) {
        this.eventHandlers.onLaunch.call(this, event.request, event.session, response);
    },

    IntentRequest: function (event, context, response) {
        this.eventHandlers.onIntent.call(this, event.request, event.session, response);
    },

    SessionEndedRequest: function (event, context) {
        this.eventHandlers.onSessionEnded(event.request, event.session);
        context.succeed();
    }
};

/**
 * Override any of the eventHandlers as needed
 */
AlexaSkill.prototype.eventHandlers = {
    /**
     * Called when the session starts.
     * Subclasses could have overriden this function to open any necessary resources.
     */
    onSessionStarted: function (sessionStartedRequest, session) {
    },

    /**
     * Called when the user launches the skill without specifying what they want.
     * The subclass must override this function and provide feedback to the user.
     */
    onLaunch: function (launchRequest, session, response) {
        throw "onLaunch should be overriden by subclass";
    },

    /**
     * Called when the user specifies an intent.
     */
    onIntent: function (intentRequest, session, response) {
        var intent = intentRequest.intent,
            intentName = intentRequest.intent.name,
            intentHandler = this.intentHandlers[intentName];
        if (intentHandler) {
            console.log('dispatch intent = ' + intentName);
            intentHandler.call(this, intent, session, response);
        } else {
            throw 'Unsupported intent = ' + intentName;
        }
    },

    /**
     * Called when the user ends the session.
     * Subclasses could have overriden this function to close any open resources.
     */
    onSessionEnded: function (sessionEndedRequest, session) {
    }
};

/**
 * Subclasses should override the intentHandlers with the functions to handle specific intents.
 */
AlexaSkill.prototype.intentHandlers = {};

AlexaSkill.prototype.execute = function (event, context) {
    try {
        console.log("session applicationId: " + event.session.application.applicationId);

        // Validate that this request originated from authorized source.
        if (this._appId && event.session.application.applicationId !== this._appId) {
            console.log("The applicationIds don't match : " + event.session.application.applicationId + " and "
                + this._appId);
            throw "Invalid applicationId";
        }

        if (!event.session.attributes) {
            event.session.attributes = {};
        }

        if (event.session.new) {
            this.eventHandlers.onSessionStarted(event.request, event.session);
        }

        // Route the request to the proper handler which may have been overriden.
        var requestHandler = this.requestHandlers[event.request.type];
        requestHandler.call(this, event, context, new Response(context, event.session));
    } catch (e) {
        console.log("Unexpected exception " + e);
        context.fail(e);
    }
};

var Response = function (context, session) {
    this._context = context;
    this._session = session;
};

Response.prototype = (function () {
    var buildSpeechletResponse = function (options) {
        var alexaResponse = {
            outputSpeech: {
                type: 'PlainText',
                text: options.output
            },
            shouldEndSession: options.shouldEndSession
        };
        if (options.reprompt) {
            alexaResponse.reprompt = {
                outputSpeech: {
                    type: 'PlainText',
                    text: options.reprompt
                }
            };
        }
        if (options.cardTitle && options.cardContent) {
            alexaResponse.card = {
                type: "Simple",
                title: options.cardTitle,
                content: options.cardContent
            };
        }
        var returnResult = {
            version: '1.0',
            response: alexaResponse
        };
        if (options.session && options.session.attributes) {
            returnResult.sessionAttributes = options.session.attributes;
        }
        return returnResult;
    };

    return {
        tell: function (speechOutput) {
            this._context.succeed(buildSpeechletResponse({
                session: this._session,
                output: speechOutput,
                shouldEndSession: true
            }));
        },
        tellWithCard: function (speechOutput, cardTitle, cardContent) {
            this._context.succeed(buildSpeechletResponse({
                session: this._session,
                output: speechOutput,
                cardTitle: cardTitle,
                cardContent: cardContent,
                shouldEndSession: true
            }));
        },
        ask: function (speechOutput, repromptSpeech) {
            this._context.succeed(buildSpeechletResponse({
                session: this._session,
                output: speechOutput,
                reprompt: repromptSpeech,
                shouldEndSession: false
            }));
        },
        askWithCard: function (speechOutput, repromptSpeech, cardTitle, cardContent) {
            this._context.succeed(buildSpeechletResponse({
                session: this._session,
                output: speechOutput,
                reprompt: repromptSpeech,
                cardTitle: cardTitle,
                cardContent: cardContent,
                shouldEndSession: false
            }));
        }
    };
})();

var http = require('http')
    , APP_ID = 'amzn1.ask.skill.649a2081-6fc1-408c-83bc-299cf36256ef';

var MyObject = function () {
    AlexaSkill.call(this, APP_ID);
};
MyObject.prototype = Object.create(AlexaSkill.prototype);
MyObject.prototype.constructor = MyObject;

MyObject.prototype.eventHandlers.onLaunch = function(launchRequest, session, response){
    var reprompt = "one Leavey Library, two GFS, three SGM, four Cromwell Track Field";

    var output = 'Where are you ? '+reprompt;
    response.ask(output, reprompt);

    console.log("onLaunch requestId: " + launchRequest.requestId
        + ", sessionId: " + session.sessionId);
};

MyObject.prototype.intentHandlers = {
    FindTram: function(intent, session, response){
        var speechOutput = 'Find a tram near to your location. Select the number corresponding to your current location. ' +
            '1. Leavy Library, 2. GFS, 3. SGM, 4. Cromwell Track Field';
        response.ask(speechOutput);
    },

    SelectLocation: function(intent, session, response){
        var l = intent.slots.location.value && parseInt(intent.slots.location.value);
        var output = '';
        switch(l){
            case 1:
                output = 'Nearest stop is on XYZ street, behind Star Bucks.';
                break;
            default :
                output = 'Sorry no trams found at this instant';
                break;
        }
        response.tell(output);
    }
};

exports.handler = (event, context, callback) => {
    var skill = new MyObject();
    skill.execute(event, context);
};


