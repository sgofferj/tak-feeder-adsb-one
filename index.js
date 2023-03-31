require('dotenv').config();
const util = require('util')

const functions = require('./lib/functions.js');
const tls = require('tls')
const fs = require('fs');
const { adsb2cot } = require('./lib/functions.js');
const fetch = require('node-fetch');


const url = process.env.REMOTE_SERVER_URL
const sslCert = process.env.REMOTE_SSL_SERVER_CERTIFICATE
const sslKey = process.env.REMOTE_SSL_SERVER_KEY
const intervalSecs = (typeof process.env.GDACS_PULL_INTERVAL !== 'undefined') ? process.env.GDACS_PULL_INTERVAL : 2;
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
    pullandfeed();
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

  function pullandfeed() {
    fetch('https://api.adsb.one/v2/mil')
  
    .then((response) => response.json())
    .then((data) => {
      for (var no in data.ac) {
        let item = data.ac[no];
        aircraft = functions.adsb2cot(item);
        if (aircraft != null) client.write(aircraft);
      }
    });
  
    setTimeout(pullandfeed,interval);
  };
};


if (url && sslCert && sslKey) {
  run();
}
