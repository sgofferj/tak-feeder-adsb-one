const { cot, proto } = require('@vidterra/tak.js')
const uuid = require('uuid');
const util = require('util')

var myCallsign = "ADSBHUB";
var myType = "a-f-G-U";
const myUID = (typeof process.env.UUID !== 'undefined') ? process.env.UUID : uuid.v4();

module.exports.heartbeatcot = (stale) => {
    const dt = Date.now();
    const dtD = new Date(dt).toISOString();
    const dtDs = new Date(dt + (3 * stale * 1000)).toISOString();

    let packet = {
        "event": {
            "_attributes": {
                "version": "2.0",
                "uid": myUID,
                "type": myType,
                "how": "h-g-i-g-o",
                "time": dtD,
                "start": dtD,
                "stale": dtDs,
            },
            "point": {
                "_attributes": {
                    "lat": "0.000000",
                    "lon": "0.000000",
                    "hae": "9999999.0",
                    "ce": "9999999.0",
                    "le": "9999999.0"
                }
            },
            "detail": {
                "takv": {
                    "_attributes": {
                        "os": "Docker",
                        "device": "Server",
                        "version": "1",
                        "platform": "NodeJS ADSBHUB feeder"
                    }
                },
                "contact": {
                    "_attributes": {
                        "callsign": myCallsign,
                        "endpoint": "*:-1:stcp"
                    }
                },
                "uid": { "_attributes": { "Droid": myCallsign } },
                "precisionlocation": { "_attributes": { "altsrc": "GPS", "geopointsrc": "GPS" } },
                "track": { "_attributes": { "course": "0", "speed": "0" } },
                "__group": { "_attributes": { "role": "Server", "name": "Blue" } },
            }
        }
    }
    return cot.js2xml(packet);
}


module.exports.adsb2cot = (hexid, cot, lat, lon, alt, squawk, callsign) => {
    const dt = Date.now();
    const dtD = new Date(dt).toISOString();
    const dtDs = new Date(dt + (60 * 1000)).toISOString();

    let remarks = "";
    remarks += "#ADSB";
    let uid = "ICAO-" + hexid.toLowerCase();
    
    let packet = {
        "event": {
            "_attributes": {
                "version": "2.0",
                "uid": uid,
                "type": cot,
                "how": "m-g",
                "time": dtD,
                "start": dtD,
                "stale": dtDs,
                "qos": "5-r-d"
            },
            "point": {
                "_attributes": {
                    "lat": lat,
                    "lon": lon,
                    "hae": alt,
                    "ce": 0.0,
                    "le": 0.0
                }
            },
            "detail": {
                "contact": {
                    "_attributes": {
                        "callsign": callsign
                    }
                },
                "link": { "_attributes": { "uid": myUID, "production_time": dtD, "type": myType, "parent_callsign": myCallsign, "relation": "p-p" } },
                "remarks": remarks
            }
        }
    }
    console.log(util.inspect(packet,false,null,true));
    return cot.js2xml(packet);
}
