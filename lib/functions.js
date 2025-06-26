const fs = require("fs");
const { cot, proto } = require("@vidterra/tak.js");
const uuid = require("uuid");
const util = require("util");

const myCallsign =
  typeof process.env.CALLSIGN !== undefined ? process.env.CALLSIGN : "adsb.one";
const myType =
  typeof process.env.MYCOT !== undefined ? process.env.MYCOT : "a-f-G-U";
const myUID =
  typeof process.env.UUID !== undefined ? process.env.UUID : uuid.v4();
const cotDBFile =
  typeof process.env.COTDB !== undefined ? process.env.COTDB : null;
const countriesDBFile =
  typeof process.env.COUNTRIESDB !== undefined ? process.env.COUNTRIESDB : null;
const LOGUNK =
  typeof process.env.LOGUNK !== undefined
    ? process.env.LOGUNK == "true"
    : false;

let cotdb;
if (cotDBFile != null) {
  let rawdata = fs.readFileSync(cotDBFile);
  cotdb = JSON.parse(rawdata);
} else cotdb = null;

let countriesdb;
if (countriesDBFile != null) {
  let rawdata = fs.readFileSync(countriesDBFile);
  countriesdb = JSON.parse(rawdata);
} else countriesdb = null;

module.exports.checkFile = (path) => {
  let result = false;
  try {
    if (fs.existsSync(path)) {
      console.log("Found " + path);
      result = true;
    } else {
      console.log("Can't find " + path);
      result = false;
    }
  } catch (err) {
    console.error(err);
  }
  return result;
};

module.exports.heartbeatcot = (stale) => {
  const dt = Date.now();
  const dtD = new Date(dt).toISOString();
  const dtDs = new Date(dt + 3 * stale * 1000).toISOString();

  let packet = {
    event: {
      _attributes: {
        version: "2.0",
        uid: myUID,
        type: myType,
        how: "h-g-i-g-o",
        time: dtD,
        start: dtD,
        stale: dtDs,
      },
      point: {
        _attributes: {
          lat: "0.000000",
          lon: "0.000000",
          hae: "9999999.0",
          ce: "9999999.0",
          le: "9999999.0",
        },
      },
      detail: {
        takv: {
          _attributes: {
            os: "Docker",
            device: "Server",
            version: "1",
            platform: "NodeJS adsb.one feeder",
          },
        },
        contact: {
          _attributes: {
            callsign: myCallsign,
          },
        },
        uid: { _attributes: { Droid: myCallsign } },
        precisionlocation: {
          _attributes: { altsrc: "GPS", geopointsrc: "GPS" },
        },
        track: { _attributes: { course: "0", speed: "0" } },
        __group: { _attributes: { role: "Server", name: "Blue" } },
      },
    },
  };
  return cot.js2xml(packet);
};

function getAffil(hexid) {
  let affil = { start: null, stop: null, affil: "u", country: "unknown" };
  hexid = hexid.toUpperCase();
  if (countriesdb != null) {
    affil = countriesdb.find((x) => x.start <= hexid && hexid <= x.end);
  }
  return affil;
}

function getType(type) {
  let result = null;
  switch (type) {
    case "A6":
      result = "-F-F";
      break;
    case "A7":
      result = "-H";
      break;
    case "B1":
      result = "-F";
      break;
    case "B2":
      result = "-L";
      break;
    case "B4":
      result = "-F";
      break;
    case "B6":
      result = "-F-Q";
      break;
    default:
      if (type.substr(0, 1) == "A") result = "-F";
      else result = "";
      break;
  }
  return result;
}

function getCOT(item) {
  let cotdata;
  let hexid = item["hex"].toLowerCase();
  if (cotdb != null) {
    if (typeof cotdb[hexid] !== undefined) cotdata = cotdb[hexid];
    else {
      let affil = getAffil(hexid);
      let type = item.hasOwnProperty("category") ? getType(item.category) : "";
      let model = item.hasOwnProperty("t") ? item.t : "unknown";
      let reg = item.hasOwnProperty("r") ? item.r : item.hex;
      let cm = "C";
      if (item.hasOwnProperty("dbFlags")) {
        if ((item.dbFlags & 1) == 1) {
          cm = "M";
        }
      }
      cottype = `a-${affil["affil"]}-A-${cm}${type}`;
      cotdata = [cottype, reg, model, affil["country"]];
      if (LOGUNK === true)
        console.log(
          `"${hexid}","COT","${reg}","${model}","${affil["country"]}"`
        );
    }
  } else cotdata = ["a-u-A", false, false, false];
  return cotdata;
}

module.exports.adsb2cot = (item) => {
  const dt = Date.now();
  const dtD = new Date(dt).toISOString();
  const dtDs = new Date(dt + 60 * 1000).toISOString();

  let result = null;

  if (
    item.hasOwnProperty("lat") &&
    item.hasOwnProperty("lon") &&
    (item.hasOwnProperty("alt_geom") || item.hasOwnProperty("alt_baro"))
  ) {
    let hex = item.hex;
    let cotdata = getCOT(item);
    let actype;
    let reg;
    let operator;
    let cott;
    if (cotdata !== undefined) {
      operator = cotdata[3];
      actype = cotdata[2];
      reg = cotdata[1];
      cott = cotdata[0];
    } else {
      actype = item.hasOwnProperty("t") ? item.t : "unknown";
    }
    let ce = item.hasOwnProperty("nac_p") ? item.nac_p : 999999;
    let le = item.hasOwnProperty("nac_v") ? item.nac_v : 999999;
    let alt =
      typeof item.alt_geom !== undefined ? item.alt_geom : item.alt_baro;
    alt = Math.round(alt * 0.3048);
    let course = item.hasOwnProperty("track") ? item.track : 0;
    let speed = item.hasOwnProperty("gs") ? item.gs * 0.514444 : 0;
    let squawk = typeof item.squawk !== undefined ? item.squawk : "----";
    let callsign; //= (typeof item.flight !== 'undefined') ? item.flight : "ICAO-" + hex;
    if (item.flight === undefined) {
      if (reg !== undefined) {
        callsign = reg;
      } else {
        callsign = "ICAO-" + hex.toLowerCase();
      }
    } else {
      callsign = item.flight;
    }

    let remarks = `ID: ${hex}, Squawk: ${squawk}\nType: ${actype}, Reg: ${reg}\n${operator} #ADSB`;
    let uid = "ICAO-" + hex.toLowerCase();
    packet = {
      event: {
        _attributes: {
          version: "2.0",
          uid: uid,
          type: cott,
          how: "m-g",
          time: dtD,
          start: dtD,
          stale: dtDs,
        },
        point: {
          _attributes: {
            lat: item.lat,
            lon: item.lon,
            hae: alt,
            ce: ce,
            le: le,
          },
        },
        detail: {
          contact: {
            _attributes: {
              callsign: callsign,
            },
          },
          precisionlocation: {
            _attributes: { altsrc: "GPS", geopointsrc: "GPS" },
          },
          link: {
            _attributes: {
              uid: myUID,
              production_time: dtD,
              type: myType,
              parent_callsign: myCallsign,
              relation: "p-p",
            },
          },
          track: { _attributes: { course: course, speed: speed } },
          remarks: [remarks],
        },
      },
    };
    result = cot.js2xml(packet);
  }
  return result;
};
