const socket=io({path:"/bind/socket/Chat"});
const token=unescape('<?=ESC(input.token)?>');
let account=null;

const ids={
	h1_chat: document.getElementById("h1_chat"),
	textarea_chatHistory: document.getElementById("textarea_chatHistory"),
	button_send: document.getElementById("button_send"),
	input_msg: document.getElementById("input_msg"),
	form_msg: document.getElementById("form_msg"),
};

function writeHistory(text){
	textarea_chatHistory.value+=text;
}
function sendMsg(){
	const msg=ids.input_msg.value;
	socket.emit("send-msg",{msg});
	writeHistory(account.nickname+": "+msg+"\n");
}

socket.on("connect",()=>{
	console.log("connected as "+socket.id);
	ids.h1_chat.style.color="unset";
	ids.h1_chat.title="Verbindung zum Server hergestellt!";
	writeHistory("Verbindung Hergestellt!\n");
});
socket.on("get-token",()=>{
	socket.emit("get-token",token);
});
socket.on("account-err",msg=>{
	alert("Sie sind NICHT angemeldet der chat kann nur mit einem Account verwendet werden. Klicken Sie jz auf Ok um sich anzumelden!");
	location.href="/account?goto=Chat";
	writeHistory("ACCOUNT ERROR!\n");
});
socket.on("receive-msg",data=>{
	const {user,time,msg}=data;
	console.log(user.nickname+": "+msg);
	writeHistory(user.nickname+": "+msg+"\n");
});
socket.on("get-myUser",accountData=>{
	account=accountData;
	writeHistory(`Angemeldet als: ${account.nickname} (${account.username})\n`);
});
socket.on("user-disconnect",data=>{
	const {user}=data;
	writeHistory(user.nickname+" hat die Verbindung getrennt\n");
});
socket.on("user-connect",data=>{
	const {user}=data;
	writeHistory(user.nickname+" hat sich Verbunden\n");
});
socket.on("disconnect",()=>{
	console.log("disconnected");
	ids.h1_chat.style.color="red";
	ids.h1_chat.title="Keine Verbindung zum Server!";
	writeHistory("Verbindung zum Server getrennt\n");
});

ids.form_msg.onsubmit=event=>{
	event.preventDefault();
	sendMsg();
	ids.input_msg.value="";
	ids.input_msg.focus();
};
