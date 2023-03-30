const {cot} = require("@vidterra/tak.js")
const helper = require('./helper.js')
const objects = require('./objectcache.js')
const net = require('net')

const url = process.env.REMOTE_TCP_SERVER

const run = () => {
	const urlMatch = url.match(/^tcp:\/\/(.+):([0-9]+)/)
	if (!urlMatch) return

	const cotAddress = urlMatch[1]
	const cotPort = urlMatch[2]

	const client = new net.Socket()
	let intervalConnect = false

	const connect = () => {
		client.connect(cotPort, cotAddress, () => {
			clearIntervalConnect();
			console.debug(`Connected to remote TCP host ${cotAddress}:${cotPort}`)
			const hello = helper.helloPkg();
			client.write(hello);
		})
	}

	const launchIntervalConnect = () => {
		if (intervalConnect) return
		intervalConnect = setInterval(connect, 5000)
	}

	const clearIntervalConnect = () => {
		if (!intervalConnect) return
		clearInterval(intervalConnect)
		intervalConnect = false
	}

	client.on('data', (data) => {
		objects.store(data);
	})

	client.on('error', (err) => {
		console.error(`Could not connect to TCP host ${url}`)
		launchIntervalConnect()
	})

	client.on('close', () => {
		console.info(`Connection to TCP host ${url} closed`)
		launchIntervalConnect()
	})

	client.on('end', launchIntervalConnect)

	connect()
}

if (url) {
	run()
}
