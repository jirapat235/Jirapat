const functions = require('firebase-functions');
const request = require("request-promise");
const admin = require('firebase-admin');

var serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://motorcycle-anti-theft-device.firebaseio.com"
});

var db = admin.firestore();

const LINE_TOKEN = 'xxxxxxx';
const LINE_MESSAGING_API = 'https://api.line.me/v2/bot/message';
const LINE_HEADER = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${LINE_TOKEN}`
};

const LINE_MESSAGING_MULTICAST_API = 'https://api.line.me/v2/bot/message/multicast';
const LINE_MESSAGING_BROADCAST_API = 'https://api.line.me/v2/bot/message/broadcast';
const LINE_MESSAGING_PUSH_API = 'https://api.line.me/v2/bot/message/push';

exports.updateHardware = functions.region('asia-northeast1').https.onRequest((request, response) => {

    const hardwareId = request.query.hardwareId;
    const sendDate = request.query.sendDate;
    const sendTime = request.query.sendTime;
    const satellites = request.query.satellites;
    const latitude = request.query.latitude;
    const longtitude = request.query.longtitude;
    const speed = request.query.speed;
    const altitude = request.query.altitude;

    var queryObject = request.query;
    
    var dataLength = Object.keys(queryObject).length;
    
    if (dataLength === 8) {
        admin.database().ref('/currentLocation/' + hardwareId).set({
            latitude: latitude,
            longtitude: longtitude,
            speed: speed,
            altitude: altitude,
            satellites: satellites,
            datetime: sendDate + " " + sendTime,
        });

        db.collection("tracker").doc(hardwareId).collection("locationData").doc().set({
            hardwareId: hardwareId,
            speed: speed,
            datetime: sendDate + " " + sendTime,
            latitude: latitude,
            longtitude: longtitude,
            altitude: altitude,
            time: sendTime,
            satellites: satellites,
            date: sendDate
        }).then(function () {
            //console.log("Document successfully written!");
            response.send("OK");
            return;
        }).catch(function (error) {
            //console.error("Error writing document: ", error);
            response.send("ERROR");
            return;
        });
    } else {
        response.status(200).send("ERROR PARAM");
        return;
    }
});

exports.LineAdapter = functions.region('asia-northeast1').https.onRequest((request, response) => {
    if (request.body.events[0].message.type !== 'text') {
        reply(request, 'ไม่พบสิ่งที่คุณต้องการค้นหา');
        return;
    } else {
        const contentText = request.body.events[0].message.text;
        const uid = request.body.events[0].source.userId;
        var dt = new Date();
        var utcDate = dt.toUTCString();

        switch (contentText.toLowerCase()) {
            case "find car":
                getCurrentLocation(request, 'abcd');
                //replyFull(request);
                break;
            default:
                reply(request, 'ไม่พบสิ่งที่คุณต้องการค้นหา');
        }
    }

});

const replyMsg = (req, msg) => {
    return request({
        method: `POST`,
        uri: `${LINE_MESSAGING_API}/reply`,
        headers: LINE_HEADER,
        body: JSON.stringify({
            replyToken: req.body.events[0].replyToken,
            messages: [msg]
        })
    });
};

const LinePush = req => {
    return request({
        method: "POST",
        uri: `${LINE_MESSAGING_PUSH_API}`,
        headers: LINE_HEADER,
        body: JSON.stringify(req)
    });
};

const LineBC = req => {
    return request({
        method: "POST",
        uri: `${LINE_MESSAGING_BROADCAST_API}`,
        headers: LINE_HEADER,
        body: JSON.stringify(req)
    });
}

const LineMulticast = req => {
    return request({
        method: "POST",
        uri: `${LINE_MESSAGING_MULTICAST_API}`,
        headers: LINE_HEADER,
        body: JSON.stringify(req)
    });
}

const reply = (req, msg) => {
    return request({
        method: `POST`,
        uri: `${LINE_MESSAGING_API}/reply`,
        headers: LINE_HEADER,
        body: JSON.stringify({
            replyToken: req.body.events[0].replyToken,
            messages: [
                {
                    type: `text`,
                    text: msg
                }
            ]
        })
    });
};

const replyFull = req => {
    return request({
        method: "POST",
        uri: `${LINE_MESSAGING_API}/reply`,
        headers: LINE_HEADER,
        body: JSON.stringify({
            replyToken: req.body.events[0].replyToken,
            messages: [
                {
                    type: "text",
                    text: JSON.stringify(req.body)
                }
            ]
        })
    });
};

const getCurrentLocation = (req, hwId) => {
    admin.database().ref('currentLocation/' + hwId).once('value', (snapshot) => {
        var event = snapshot.val();
        const replyMessage = {
            "type": "flex",
            "altText": "Current Location",
            "contents": {
                "type": "bubble",
                "direction": "ltr",
                "hero": {
                    "type": "image",
                    "url": "https://firebasestorage.googleapis.com/v0/b/iot-project-xxxxxx.appspot.com/o/profile2.png?alt=media&token=3d2db705-c53b-44eb-a085-012f81b332d4",
                    "size": "full",
                    "aspectRatio": "2:1",
                    "aspectMode": "cover"
                },
                "body": {
                    "type": "box",
                    "layout": "vertical",
                    "contents": [
                        {
                            "type": "box",
                            "layout": "horizontal",
                            "contents": [
                                {
                                    "type": "image",
                                    "url": "https://firebasestorage.googleapis.com/v0/b/iot-project-xxxxxx.appspot.com/o/geolocalization.png?alt=media&token=d285192c-fbd5-45f5-a631-cc03bc098445",
                                    "flex": 0,
                                    "align": "start",
                                    "size": "xxs",
                                    "aspectRatio": "2:1"
                                },
                                {
                                    "type": "text",
                                    "text": "Latitude",
                                    "size": "xs",
                                    "gravity": "center",
                                    "weight": "bold"
                                },
                                {
                                    "type": "text",
                                    "text": `${event.latitude}`,
                                    "size": "xs",
                                    "align": "end",
                                    "gravity": "center"
                                }
                            ]
                        },
                        {
                            "type": "box",
                            "layout": "horizontal",
                            "margin": "sm",
                            "contents": [
                                {
                                    "type": "image",
                                    "url": "https://firebasestorage.googleapis.com/v0/b/iot-project-xxxxxx.appspot.com/o/geolocalization.png?alt=media&token=d285192c-fbd5-45f5-a631-cc03bc098445",
                                    "flex": 0,
                                    "align": "start",
                                    "size": "xxs",
                                    "aspectRatio": "2:1"
                                },
                                {
                                    "type": "text",
                                    "text": "Longitude",
                                    "size": "xs",
                                    "gravity": "center",
                                    "weight": "bold"
                                },
                                {
                                    "type": "text",
                                    "text": `${event.longtitude}`,
                                    "size": "xs",
                                    "align": "end",
                                    "gravity": "center"
                                }
                            ]
                        },
                        {
                            "type": "box",
                            "layout": "horizontal",
                            "margin": "sm",
                            "contents": [
                                {
                                    "type": "image",
                                    "url": "https://firebasestorage.googleapis.com/v0/b/iot-project-xxxxxx.appspot.com/o/satellite-dish.png?alt=media&token=32a4f01d-8040-40f0-b1c4-c142eb3a6646",
                                    "flex": 0,
                                    "align": "start",
                                    "size": "xxs",
                                    "aspectRatio": "2:1"
                                },
                                {
                                    "type": "text",
                                    "text": "Satellites",
                                    "size": "xs",
                                    "weight": "bold"
                                },
                                {
                                    "type": "text",
                                    "text": `${event.satellites}`,
                                    "size": "xs",
                                    "align": "end"
                                }
                            ]
                        },
                        {
                            "type": "box",
                            "layout": "horizontal",
                            "margin": "sm",
                            "contents": [
                                {
                                    "type": "image",
                                    "url": "https://firebasestorage.googleapis.com/v0/b/iot-project-xxxxxx.appspot.com/o/goal.png?alt=media&token=8215f2b1-3aea-482c-9b26-120869280897",
                                    "flex": 0,
                                    "size": "xxs",
                                    "aspectRatio": "2:1"
                                },
                                {
                                    "type": "text",
                                    "text": "Altitude",
                                    "size": "xs",
                                    "gravity": "center",
                                    "weight": "bold"
                                },
                                {
                                    "type": "text",
                                    "text": `${event.altitude}`,
                                    "size": "xs",
                                    "align": "end",
                                    "gravity": "center"
                                }
                            ]
                        },
                        {
                            "type": "box",
                            "layout": "horizontal",
                            "margin": "sm",
                            "contents": [
                                {
                                    "type": "image",
                                    "url": "https://firebasestorage.googleapis.com/v0/b/iot-project-xxxxxx.appspot.com/o/speedometer.png?alt=media&token=29c58d3b-b0ea-4ede-a453-c3a11a0bf9c6",
                                    "flex": 0,
                                    "size": "xxs",
                                    "aspectRatio": "2:1"
                                },
                                {
                                    "type": "text",
                                    "text": "Speed (KM/H)",
                                    "size": "xs",
                                    "gravity": "center",
                                    "weight": "bold"
                                },
                                {
                                    "type": "text",
                                    "text": `${event.speed}`,
                                    "size": "xs",
                                    "align": "end",
                                    "gravity": "center"
                                }
                            ]
                        },
                        {
                            "type": "box",
                            "layout": "horizontal",
                            "margin": "sm",
                            "contents": [
                                {
                                    "type": "image",
                                    "url": "https://firebasestorage.googleapis.com/v0/b/iot-project-xxxxxx.appspot.com/o/calendar.png?alt=media&token=74dbb488-f429-4a57-9976-ec718a2d01a9",
                                    "flex": 0,
                                    "align": "start",
                                    "size": "xxs",
                                    "aspectRatio": "2:1"
                                },
                                {
                                    "type": "text",
                                    "text": "Last Update",
                                    "size": "xs",
                                    "gravity": "center",
                                    "weight": "bold"
                                },
                                {
                                    "type": "text",
                                    "text": `${event.datetime}`,
                                    "size": "xxs",
                                    "align": "end",
                                    "gravity": "center"
                                }
                            ]
                        }
                    ]
                },
                "footer": {
                    "type": "box",
                    "layout": "horizontal",
                    "contents": [
                        {
                            "type": "button",
                            "action": {
                                "type": "uri",
                                "label": "Direction",
                                "uri":`https://www.google.com/maps/search/${event.latitude},${event.longtitude}`
                            },
                            "style": "primary"
                        }
                    ]
                }
            }
        }

        replyMsg(req, replyMessage);

    });
}
