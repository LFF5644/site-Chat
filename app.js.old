const socket=io({path:"/bind/socket/Chat"});
const token=unescape('<?=ESC(input.token)?>');
const history=[];
let clients={};
let account=null;
let display="chat";

const ids={
	h1_chat: document.getElementById("h1_chat"),
	button_send: document.getElementById("button_send"),
	input_msg: document.getElementById("input_msg"),
	form_msg: document.getElementById("form_msg"),
	div_chat: document.getElementById("div_chat"),
	img_settings: document.getElementById("img_settings"),
	span_socketConnected: document.getElementById("span_socketConnected"),
	ul_onlineClients: document.getElementById("ul_onlineClients"),
};

const displays={
	chat: document.getElementById("div_display_chat"),
	settings: document.getElementById("div_display_settings"),
};

const sounds={
	msg: "/files/sounds/ding.mp3",
	connect: "/files/sounds/addUSB.wav",
	disconnect: "/files/sounds/removeUSB.wav",
};

function changeDisplay(to){
	if(to==display) return;
	document.getElementById("div_display_"+display).classList.add("hidden");
	document.getElementById("div_display_"+to).classList.remove("hidden");
	display=to;
	onDisplayChange();
}
function onDisplayChange(){
	console.log("show now display "+display);
	if(display=="chat"){
		// if display changed to "chat"
		scrollTo(0,document.body.scrollHeight);
	}	
	else if(display=="settings"){
		// if display changed to "settings"
		scrollTo(0,0);
		const html=(Object.keys(clients)
			.map(item=>clients[item].user)
			.map(item=>`<li title="${item.username}">${item.nickname}</li>`)
			.join("")
		);
		ids.span_socketConnected.innerText=socket.connected?"Verbunden":"Nicht verbunden!";
		ids.span_socketConnected.style.color=socket.connected?"green":"red";
		ids.ul_onlineClients.innerHTML=html;
	}
}
function getTime(time=Date.now()){
	const date=new Date(time);
	let str=String(date.getHours()).padStart(2,"0");
	str+=":";
	str+=String(date.getMinutes()).padStart(2,"0");
	return str;
}
function vibrate(time){
	if(navigator.vibrate){
		navigator.vibrate(time);
	}
}
function playSound(key){
	const sound=sounds[key];
	if(!sound){
		console.log("sound key not found");
		return false;
	}
	let audio=document.getElementById("audio_sound_"+key);
	if(!audio){
		audio=document.createElement("audio");
		audio.id="audio_sound_"+key;
		audio.src=sound;
		document.body.appendChild(audio);
	}
	audio.currentTime=0;
	if(audio.paused) audio.play();
}
function appendHistory(data){
	let {type,text,user,time}=data;
	history.push(data);
	
	if(typeof(data)=="string") text=data;
	if(text) text=text.trim();
	if(!time) time=Date.now();

	const div=document.createElement("div");
	div.innerHTML="";
	if(type=="msg"){
		const me=user.username==account.username;
		div.classList.add("msg");
		if(me) div.classList.add("me");

		const h3_nickname=document.createElement("h3");
		h3_nickname.classList.add("nickname");
		h3_nickname.innerText=user.nickname;
		h3_nickname.title=user.username;
		div.appendChild(h3_nickname);

		const p_text=document.createElement("p");
		p_text.classList.add("text");
		p_text.innerText=text;
		div.appendChild(p_text);

		const p_time=document.createElement("p");
		p_time.classList.add("time");
		p_time.innerText=getTime(time);
		div.appendChild(p_time);
		if(!me&&display=="chat"){ // if other user send msg & current showing is chat
			playSound("msg");
			vibrate(1e3);
		}
	}
	else if(type=="info"){
		div.classList.add("info");

		const p_text=document.createElement("p");
		p_text.classList.add("text");
		p_text.innerText=text;
		div.appendChild(p_text);

		const p_time=document.createElement("p");
		p_time.classList.add("time");
		p_time.innerText=getTime(time);
		div.appendChild(p_time);
	}
	else if(type=="small"||typeof(data)=="string"){
		div.classList.add("small");

		const p_text=document.createElement("p");
		p_text.classList.add("text");
		p_text.innerText=text;
		div.appendChild(p_text);
	}
	ids.div_chat.appendChild(div);
	if(display=="chat") scrollTo(0,document.body.scrollHeight);
}
function sendMsg(){
	const msg=ids.input_msg.value;
	socket.emit("send-msg",{msg});
	appendHistory({
		type: "msg",
		text: msg,
		user: account,
	});
}

socket.on("connect",()=>{
	console.log("connected as "+socket.id);
	ids.h1_chat.style.color="unset";
	ids.h1_chat.title="Verbindung zum Server hergestellt!";
	appendHistory("Verbindung hergestellt!");
});
socket.on("get-token",()=>{
	socket.emit("get-token",token);
});
socket.on("account-err",msg=>{
	alert("Sie sind NICHT angemeldet der chat kann nur mit einem Account verwendet werden. Klicken Sie jz auf Ok um sich anzumelden!");
	location.href="/account?goto=Chat";
	appendHistory("ACCOUNT ERROR!");
});
socket.on("receive-msg",data=>{
	const {user,time,msg}=data;
	console.log(user.nickname+": "+msg);
	appendHistory({
		type: "msg",
		text: msg,
		user,
		time,
	});
});
socket.on("get-myUser",accountData=>{
	account=accountData;
	appendHistory(`Angemeldet als: ${account.nickname} (${account.username})`);
});
socket.on("user-disconnect",client=>{
	const key=client.socketId;
	delete clients[key];
	appendHistory(client.user.nickname+" hat die Verbindung getrennt");
	if(display=="settings"){
		onDisplayChange();
	}
});
socket.on("user-connect",client=>{
	const key=client.socketId;
	client.socketId=undefined;
	clients[key]=client;
	appendHistory(client.user.nickname+" hat sich Verbunden");
	if(display=="settings"){
		onDisplayChange();
	}
});
socket.on("clients-connected",data=>{
	console.log(data);
	clients=data;
})
socket.on("disconnect",()=>{
	console.log("disconnected");
	ids.h1_chat.style.color="red";
	ids.h1_chat.title="Keine Verbindung zum Server!";
	appendHistory("Verbindung zum Server getrennt");
});

ids.form_msg.onsubmit=event=>{
	event.preventDefault();
	sendMsg();
	ids.input_msg.value="";
	ids.input_msg.focus();
};
