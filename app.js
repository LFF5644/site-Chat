const socket=io({path:"/bind/socket/Chat"});
const token=unescape('<?=ESC(input.token)?>');
const history=[];
let account=null;

const ids={
	h1_chat: document.getElementById("h1_chat"),
	button_send: document.getElementById("button_send"),
	input_msg: document.getElementById("input_msg"),
	form_msg: document.getElementById("form_msg"),
	div_chat: document.getElementById("div_chat"),
};

function getTime(time=Date.now()){
	const date=new Date(time);
	let str=String(date.getHours()).padStart(2,"0");
	str+=":";
	str+=String(date.getMinutes()).padStart(2,"0");
	return str;
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
	scrollTo(0,document.body.scrollHeight);
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
socket.on("user-disconnect",data=>{
	const {user}=data;
	appendHistory(user.nickname+" hat die Verbindung getrennt");
});
socket.on("user-connect",data=>{
	const {user}=data;
	appendHistory(user.nickname+" hat sich Verbunden");
});
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
