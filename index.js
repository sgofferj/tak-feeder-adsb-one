const sbs1 = require('sbs1');
var client = sbs1.createClient({"host":"data.adsbhub.org","port":"5002"});
client.on('message', function(msg) {
  if (msg.message_type === sbs1.MessageType.TRANSMISSION &&
      msg.transmission_type === sbs1.TransmissionType.ES_AIRBORNE_POS) {
    console.log('coords: ' + msg.lat + ', ' + msg.lon);
  }
});