const fs = require('fs');
const constants = require('./consts');
require('dotenv').config();
const cors = require('cors');
const parser = require('body-parser');

const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
var SocketIOFileUpload = require('socketio-file-upload')
const sio = require('socket.io');
const Server = sio.Server;
const mongoose = require('mongoose');

app.use(cors());
app.use(SocketIOFileUpload.router);
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
const Image = require('./Image');
const e = require('cors');

Msg.deleteMany({}).exec();
Image.deleteMany({}).exec();

function cleanupUploads() {
	const path = require('path');
	const directory = 'uploads';
	fs.readdir(directory, (err, files) => {
		if (err) throw err;
		for (const file of files) {
			fs.unlink(path.join(directory, file), err => {
				if (err) throw err;
			});
		}
	});
};
cleanupUploads();

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

	var uploader = new SocketIOFileUpload();
	uploader.dir = "./uploads";
	uploader.listen(socket);

	uploader.on("saved", function (event) {//called for each image uploaded
		console.log('upload saved');
		console.log(event.file);

		var a = new Image();
		a.img.data = fs.readFileSync('./uploads/' + event.file.name);
		a.img.contentType = 'image/' + event.file.name.slice(-3);//change when needed
		a.img.from = event.file.meta.from;
		a.img.to = event.file.meta.to;

		if (event.file.meta.to == '') {
			a.save().then((res) => {
				const data = res.img;
				data.createdAt = res.createdAt;

				io.emit(constants.BR_IMG, data);

				cleanupUploads();
			}).catch((err) => console.log(err));
		} else {
			a.save().then((res) => {
				const data = res.img;
				data.createdAt = res.createdAt;

				socket.to(users[event.file.meta.to]).emit(constants.UNI_IMG, data);
				socket.emit(constants.UNI_IMG, data);

				cleanupUploads();
			}).catch((err) => { console.log(err); });
		}
	});
	uploader.on("error", function (event) {
		console.log("Error from uploader", event);
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
		console.log('in retrieve');
		console.log(users);

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
				}, (err, tdata) => {
					if (err) {
						console.log(err);
					} else {
						Image.find({
							$or: [
								{
									$and: [
										{ "img.from": users[0] },
										{ "img.to": users[1] }
									]
								},
								{
									$and: [
										{ "img.from": users[1] },
										{ "img.to": users[0] }
									]
								}
							]
						}, (err, idata) => {
							if (err) {
								console.log(err);
							} else {
								var res = [];

								for (var t of tdata) {
									console.log(t._doc);
									if (t._doc) {
										console.log('has doc');
										res.push(t._doc);
									} else {
										console.log('no doc');
										res.push(t);
									}
								}

								for (var d of idata) {
									const x = d.img;
									x.createdAt = d.createdAt;
									res.push(x);
								}

								socket.emit(constants.RETRIEVE, res);
							}
						});
					}
				});
			} else {
				Msg.find({ to: '' }, (err, tdata) => {
					if (err) {
						console.log(err);
					} else {
						Image.find({ "img.to": '' }, (err, idata) => {
							if (err) {
								console.log(err);
							} else {
								var res = [];

								for (var t of tdata) {
									console.log(t._doc);
									if (t._doc) {
										console.log('has doc');
										res.push(t._doc);
									} else {
										console.log('no doc');
										res.push(t);
									}
								}

								for (var d of idata) {
									const x = d.img;
									x.createdAt = d.createdAt;
									res.push(x);
								}

								socket.emit(constants.RETRIEVE, res);
							}
						});
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
