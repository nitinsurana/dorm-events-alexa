var AWS = require("aws-sdk");

AWS.config.update({
    region: "us-east-1",
    endpoint: "https://dynamodb.us-east-1.amazonaws.com"
});

var docClient = new AWS.DynamoDB.DocumentClient();

var allMovies = [{
    "description": "Los Angeles Mayor Eric Garcetti and LA Entrepreneur in Residence Jason Nazar invite you to join us for what will be Los Angeles’s largest Tech Job Fair. We plan to feature 200+ of LA’s premier technology companies looking to hire great candidates. Mark Your Calendar: The event will take place at The Reef in Downtown Los Angeles on Thursday, January 26th from 11-8pm",
    "end_time": "2017-01-26T20:00:00-0800",
    "name": "Los Angeles’s largest Tech Job Fair",
    "place": {
        "name": "The REEF L.A.",
        "location": {"city": "Los Angeles", "country": "United States", "latitude": 34.031016372469, "longitude": -118.26661340076, "state": "CA", "street": "1933 S Broadway", "zip": "90007"},
        "id": "625195740868495"
    },
    "start_time": "2017-01-26T11:00:00-0800",
    "id": "664777707020907",
    "rsvp_status": "unsure"
}, {
    "description": "Updated event 2",
    "end_time": "2016-12-05T22:00:00-0800",
    "name": "ACA Study Nights (FREE Food before Finals!!!)",
    "place": {
        "name": "McCarthy Quad",
        "location": {"city": "Los Angeles", "country": "United States", "latitude": 34.02096709958, "located_in": "134972803193847", "longitude": -118.28304696059, "state": "CA", "zip": "90089"},
        "id": "101121823281515"
    },
    "start_time": "2016-12-05T20:00:00-0800",
    "id": "1169793293127829",
    "rsvp_status": "unsure"
}];
var params = {
    TableName: "events",
    Item: {
        "events": allMovies,
        "token": "nitinsurana"
    }
};

docClient.put(params, function (err, data) {
    if (err) {
        console.error("Unable to add movie", ". Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("PutItem succeeded:");
    }
});

docClient.get({
    TableName: "temp2",
    Key: {
        "token": "nitinsurana"
    }
}, function (err, data) {
    if (err) {
        console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("GetItem succeeded:", JSON.stringify(data.Item.events, null, 2));
    }
});