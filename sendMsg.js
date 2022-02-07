var socket = io();
var p = null;
while (p === null) {
	p = prompt('Identification:');
}
socket.emit(AUTH, { id: p });

const userList = document.getElementById("names");
const msgList = document.getElementById("messages");
const form = document.getElementById("form");
const input = document.getElementById("input");

var curCommUserId = '';
var otherUsers = {};//might not be needed

form.addEventListener("submit", (e) => {
	e.preventDefault();
	if (input.value) {
		if (curCommUserId == '') {
			socket.emit(BROADCAST, { msg: input.value, id: p });
		} else {
			socket.emit(UNICAST, { recvrId: curCommUserId, msg: input.value, senderId: p });
		}
		input.value = "";
	}
});

var lis = {};

const liClick = (event) => {
	console.log('in liClick');

	if (event.target.className != 'selected') {
		for (var j in lis)
			lis[j].classList.remove('selected');
		event.target.classList.add('selected');

		curCommUserId = event.target.textContent.slice(4);//holds id not socketid
	} else {
		event.target.classList.remove('selected');
		curCommUserId = '';
	}

	socket.emit(RETRIEVE, [p, curCommUserId]);

	//TODO download all msgs for the selected channel
};

socket.on(AUTH, (others) => {
	console.log('in auth');
	console.log(others);

	for (var k in others) {
		var item = document.createElement('li');
		item.textContent = 'user' + k;
		item.addEventListener('click', liClick);
		userList.appendChild(item);
		lis[k] = item;
	}
	otherUsers = others;

	socket.emit(RETRIEVE, [p, curCommUserId]);

	console.log(lis);
});

socket.on(ADDU, (user) => {
	console.log('in addu');
	console.log(user);

	if (!otherUsers.hasOwnProperty(user[0])) {
		var item = document.createElement('li');
		item.textContent = 'user' + user[0];
		item.addEventListener('click', liClick);
		userList.appendChild(item);
		otherUsers[user[0]] = user[1];
		lis[user[0]] = item;
	}

	console.log(otherUsers);
	console.log(lis);
});

socket.on(REMOVEU, (id) => {
	console.log('in remove');

	if (id == curCommUserId)
		lis[id].click();

	delete otherUsers[id];
	lis[id].remove();
	delete lis[id];

	console.log(otherUsers);
	console.log(lis);
});

function msgUi(data) {
	return 'user' + data.from + ':' + '\xa0\xa0\xa0\xa0\xa0\xa0' + data.msg + '\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0' + '(' + data.createdAt + ')';
}

socket.on(BROADCAST, function (data) {
	console.log('in broadcast, curCommUserId=' + curCommUserId);
	console.log(data);

	if (curCommUserId == '') {//if on broadcast channel
		var item = document.createElement('li');
		item.textContent = msgUi(data);
		msgList.appendChild(item);
	}
	//window.scrollTo(0, document.body.scrollHeight);
});

socket.on(UNICAST, (data) => {
	console.log('in unicast, curCommUserId=' + curCommUserId);
	console.log(data);

	if (curCommUserId == data.from || curCommUserId == data.to) {
		var item = document.createElement('li');
		item.textContent = msgUi(data);
		msgList.appendChild(item);
	}
});

socket.on(RETRIEVE, (msgs) => {
	console.log('in retrieve, curCommUserId=' + curCommUserId);
	console.log(msgs);

	if (msgs.length > 1) {
		msgs.sort((a, b) => {
			const x = a.createdAt;
			const y = b.createdAt;
			if (x < y) {
				return -1;
			}
			if (x > y) {
				return 1;
			}
			return 0;
		});
	}

	const m = msgList.getElementsByTagName('li');
	for (var i = m.length - 1; i >= 0; i--) {
		m[i].remove();
	}

	for (var i = 0; i < msgs.length; i++) {
		var item = document.createElement('li');
		item.textContent = msgUi(msgs[i]);
		//to color/position msg as per user
		msgList.appendChild(item);
	}
});
