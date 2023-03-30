const {cot, proto} = require('@vidterra/tak.js')
const os = require('os')

module.exports.helloPkg = () => {
  const dt = Date.now();
  const dtD = new Date(dt).toISOString();
  const dtD5 = new Date(dt + 250000).toISOString();
  const pkg = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><event version="2.0" type="t-x-d-d" uid="tak-web-map" time="'+dtD+'" start="'+dtD+'" stale="'+dtD5+'" how="m-g"/>';
  return pkg;
}

module.exports.failExit = (msg) => {
  console.log(msg);
  process.exit(1);
}

module.exports.cLog = (req) => {
  var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress
  console.log('{"Timestamp":"' + Date.now() + '","IP":"' + ip + '","Method":"' + req.method + '","URL":"' + req.url + '","Result":"200"},"Parameters":[' + JSON.stringify(req.body) + ']');
}

module.exports.findCotTcp = (raw) => {
	const stringData = raw.toString()
	return stringData.match(/<event.*?<\/event>/g) // split incoming data into individual COT messages
}

module.exports.findCotTtl = (startDate,staleDate) => {
	const ttl = (Date.parse(staleDate) - Date.parse(startDate)) / 1000;
	return ttl;
}
