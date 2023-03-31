
require('dotenv').config();

const functions = require('./lib/functions.js');
const tls = require('tls')
const fs = require('fs');
const sbs1 = require('sbs1');
const { adsb2cot } = require('./lib/functions.js');

let rawdata = fs.readFileSync('cotdb_indexed.json');
let cotdb = JSON.parse(rawdata);
rawdata = fs.readFileSync('aircrafts.json');
let acdb = JSON.parse(rawdata);

const url = process.env.REMOTE_SERVER_URL
const sslCert = process.env.REMOTE_SSL_SERVER_CERTIFICATE
const sslKey = process.env.REMOTE_SSL_SERVER_KEY
const intervalSecs = (typeof process.env.GDACS_PULL_INTERVAL !== 'undefined') ? process.env.GDACS_PULL_INTERVAL : 60;
const logCot = (typeof process.env.LOGCOT !== 'undefined') ? process.env.LOGCOT : false;

const heartbeatIntervall = 30 * 1000;
var interval = intervalSecs * 1000;

process.env.TZ = 'UTC';

const run = () => {

  const urlMatch = url.match(/^ssl:\/\/(.+):([0-9]+)/)
  if (!urlMatch) return

  const options = {
    host: urlMatch[1],
    port: urlMatch[2],
    cert: fs.readFileSync(sslCert),
    key: fs.readFileSync(sslKey),
    rejectUnauthorized: false
  }

  const client = tls.connect(options, () => {
    if (client.authorized) {
      console.log("Connection authorized by a Certificate Authority.")
    } else {
      console.log("Connection not authorized: " + client.authorizationError)
    }
    heartbeat();
  })

  client.on('data', (data) => {
    console.log(data.toString());
  })

  client.on('error', (err) => {
    console.error(`Could not connect to SSL host ${url}`)
    setTimeout(run, 10);
  })

  client.on('close', () => {
    console.info(`Connection to SSL host ${url} closed`)
    setTimeout(run, 10);
  })

  function heartbeat() {
    client.write(functions.heartbeatcot(heartbeatIntervall));
    if (logCot) {
      console.log(functions.heartbeatcot(intervalSecs));
      console.log('-----')
    }
    setTimeout(heartbeat, heartbeatIntervall);
  }

  const adsbhub = sbs1.createClient({ "host": "data.adsbhub.org", "port": "5002" });

  adsbhub.on('message', function (msg) {
    console.log(msg);
    if (msg.message_type === sbs1.MessageType.TRANSMISSION && msg.transmission_type === sbs1.TransmissionType.ES_AIRBORNE_POS) {
      let cot;
      let callsign;
      if (cotdb[msg.hex_ident]) {
        cot = cotdb[msg.hex_ident][0]
      }
      else if (acdb[msg.hex_ident]) {
        cot = "a-u-A-C-F"
      }
      else {
        cot = "a-u-A"
      }
      if (msg.callsign != null) {
        callsign = msg.callsign;
        console.log(functions.adsb2cot(msg.hex_ident,cot,msg.lat,msg.lon,msg.altitude,msg.squawk,callsign));
      } else console.log(msg);
    }
  });

};

if (url && sslCert && sslKey) {
  run();
}
