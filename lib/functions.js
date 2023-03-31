const fs = require('fs');
const { cot, proto } = require('@vidterra/tak.js')
const uuid = require('uuid');
const util = require('util')

var myCallsign = "ADSBHUB";
var myType = "a-f-G-U";
const myUID = (typeof process.env.UUID !== 'undefined') ? process.env.UUID : uuid.v4();

let rawdata = fs.readFileSync('cotdb_indexed.json');
let cotdb = JSON.parse(rawdata);

function getCOT(hexid) {
    let cot;
    if (typeof cotdb[hexid] !== 'undefined') cot = cotdb[hexid][0];
    else cot = "a-u-A";
    console.log(hexid,cotdb[hexid],cot);
    return cot;
}

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


module.exports.adsb2cot = (item) => {
    const dt = Date.now();
    const dtD = new Date(dt).toISOString();
    const dtDs = new Date(dt + (60 * 1000)).toISOString();

    let result = null;

    if ((item.hasOwnProperty('lat')) && (item.hasOwnProperty('lon')) && ((item.hasOwnProperty('alt_geom')) || (item.hasOwnProperty('alt_baro')))) {
        let hex = item.hex;
        let ce = (item.hasOwnProperty('nac_p')) ? item.nac_p : 999999;
        let le = (item.hasOwnProperty('nac_v')) ? item.nac_v : 999999;
        let alt = (typeof item.alt_geom !== 'undefined') ? item.alt_geom : item.alt_baro;
        let course = (item.hasOwnProperty('track')) ? item.track : 0;
        let speed = (item.hasOwnProperty('gs')) ? item.gs * 0.514444 : 0;
          alt = Math.round(alt * 0.3048); 
        const squawk = (typeof item.squawk !== 'undefined') ? item.squawk : "----";
        const callsign = (typeof item.flight !== 'undefined') ? item.flight : "ICAO-"+hex;
        let cottype = getCOT(hex);
    
        let remarks = hex;
        remarks += " #ADSB";
        let uid = "ICAO-" + hex.toLowerCase();
        packet = {
            "event": {
                "_attributes": {
                    "version": "2.0",
                    "uid": uid,
                    "type": cottype,
                    "how": "m-g",
                    "time": dtD,
                    "start": dtD,
                    "stale": dtDs
                },
                "point": {
                    "_attributes": {
                        "lat": item.lat,
                        "lon": item.lon,
                        "hae": alt,
                        "ce": ce,
                        "le": le
                    }
                },
                "detail": {
                    "contact": {
                        "_attributes": {
                            "callsign": callsign
                        }
                    },
                    "link": { "_attributes": { "uid": myUID, "production_time": dtD, "type": myType, "parent_callsign": myCallsign, "relation": "p-p" } },
                    "track": { "_attributes": { "course": course, "speed": speed } },
                    "remarks": [ remarks ]
                }
            }
        }
        result = cot.js2xml(packet);
    }
    return result;
}
