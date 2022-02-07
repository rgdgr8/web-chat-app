const fs = require('fs');
const constants = require('./consts');
require('dotenv').config();
const cors = require('cors');
const parser = require('body-parser');

const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const sio = require('socket.io');
const Server = sio.Server;
const mongoose = require('mongoose');

app.use(cors());
app.use(parser.json());
app.use(express.static('./public'));

mongoose.connect(process.env.CONNECT_RGDGR, (err) => {
	if (err) {
		console.log('Connection unsuccessful');
		console.log(err);
	} else {
		console.log('connected to db!');
	}
});

var users = {};
const Msg = require('./Msg');
Msg.deleteMany({}).exec();

const io = new Server(server);
io.on('connection', (socket) => {
	console.log(socket.conn.transport.name);
	socket.use((packet, next) => {
		console.log(socket.conn.transport.name);
		console.log(packet);
		next();
	});
	socket.on(constants.AUTH, (creds) => {
		var id = creds.id;
		users[id] = socket.id;

		var u = {};
		for (var k in users) {
			if (k != id)
				u[k] = users[k];
		}
		socket.emit(constants.AUTH, u);

		console.log(id + 'connected');
		console.log(users);

		socket.broadcast.emit(constants.ADDU, [id, users[id]]);

		/*socket.on('disconnect', () => {
			console.log(id + 'disconnected ', socket.id);

			delete users[id];

			console.log(users);

			socket.broadcast.emit(constants.REMOVEU, id);
		});*/
	});

	socket.on(constants.BROADCAST, (data) => {
		const msg = new Msg({
			from: data.id,
			to: '',
			msg: data.msg
		});

		msg.save().then((res) => {
			io.emit(constants.BROADCAST, res);
		}).catch((err) => {
			console.log(err);
		});
	});

	socket.on(constants.UNICAST, (data) => {
		const msg = new Msg({
			from: data.senderId,
			to: data.recvrId,
			msg: data.msg
		});

		msg.save().then((res) => {
			socket.to(users[data.recvrId]).emit(constants.UNICAST, res);
			socket.emit(constants.UNICAST, res);
		}).catch((err) => {
			console.log(err);
		});
	})

	socket.on(constants.RETRIEVE, (users) => {
		try {
			if (users[1] != '') {
				Msg.find({
					$or: [
						{
							$and: [
								{ from: users[0] },
								{ to: users[1] }
							]
						},
						{
							$and: [
								{ from: users[1] },
								{ to: users[0] }
							]
						}
					]
				}, (err, data) => {
					if (err) {
						console.log(err);
					} else {
						socket.emit(constants.RETRIEVE, data);
					}
				});
			} else {
				Msg.find({ to: '' }, (err, data) => {
					if (err) {
						console.log(err);
					} else {
						socket.emit(constants.RETRIEVE, data);
					}
				});
			}
		} catch (e) {
			console.log(e);
		}
	});
});

app.get('/sendMsg.js', (req, res) => {
	fs.readFile('./sendMsg.js', (err, data) => {
		res.status(200).end(data);
	});
});
app.get('/consts.js', (req, res) => {
	fs.readFile('./consts.js', (err, data) => {
		res.status(200).end(data);
	});
});
app.all('*', (req, res) => { res.status(404).end('Resource not found'); });
server.listen(3000);
