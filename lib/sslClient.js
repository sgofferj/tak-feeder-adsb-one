const {cot} = require("@vidterra/tak.js")
const fs = require('fs')
const helper = require('./helper.js')
const objects = require('./objectcache.js')
const tls = require('tls')

const url = process.env.REMOTE_SSL_SERVER
const sslCert = process.env.REMOTE_SSL_SERVER_CERTIFICATE
const sslKey = process.env.REMOTE_SSL_SERVER_KEY

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
    const hello = helper.helloPkg();
    client.write(hello);
  })

  client.on('data', (data) => {
    objects.store(data);
  })

  client.on('error', (err) => {
    console.error(`Could not connect to SSL host ${url}`)
  })

  client.on('close', () => {
    console.info(`Connection to SSL host ${url} closed`)
  })

}
if (url && sslCert && sslKey) {
  run()
}
