/**
	@type {typeof import('lui/index')}
*/
const lui=window.lui;
const {
	init,
	node,
	node_dom,
	node_map,
	hook_effect,
	hook_memo,
	hook_model,
}=lui;

const model={
	init:()=>({
		account: null,
		chatroom: "global",
		chatrooms: [],
		clients: [],
		connected: false,
		history: [],
		msg: "",
		notificationPermission: "default",
		view: "chatrooms",
	}),
	setConnected:(state,bool)=>({
		...state,
		connected: bool,
	}),
	appendHistory:(state,data)=>({
		...state,
		history:[
			...state.history,
			{
				id: Date.now(),
				msg: null,
				success: true,
				type: "small",
				user: null,
				...data,
			},
		],
	}),
	changeHistory:(state,{id,...data})=>({
		...state,
		history:(state.history
			.map(item=>item.id!==id?item:{...item,...data})
		),
		
	}),
	clearHistory: state=>({
		...state,
		history: [],
	}),
	setAccount:(state,account)=>({
		...state,
		account,
	}),
	setView:(state,view)=>({
		...state,
		view,
	}),
	setMsg:(state,msg)=>({
		...state,
		msg,
	}),
	setClients:(state,clients)=>({
		...state,
		clients,
	}),
	appendClient:(state,client)=>({
		...state,
		clients: [
			...state.clients,
			{
				id: "",
				user: null,
				...client,
			},
		],
	}),
	removeClient:(state,id)=>({
		...state,
		clients: state.clients.filter(item=>item.id!==id),
	}),
	setNotificationPermission:(state,notificationPermission)=>({
		...state,
		notificationPermission,
	}),
	setChatrooms:(state,chatrooms)=>({
		...state,
		chatrooms,
	}),
	setChatroom:(state,chatroom)=>({
		...state,
		chatroom,
	}),
	changeChatroom_fromOther:(state,client)=>({
		...state,
		clients: state.clients.map(item=>item.id!==client.id?item:{
			...item,
			chatroom: client.chatroom,
		}),
	}),
};

function getTime(time=Date.now()){
	const date=new Date(time);
	let str=String(date.getHours()).padStart(2,"0");
	str+=":";
	str+=String(date.getMinutes()).padStart(2,"0");
	return str;
}
function getToken(){
	const cookie=document.cookie.split("; ").find(item=>item.startsWith("token="));
	if(cookie) return cookie.substring(6);
	return null;
}
function sendMessage(data){
	const {
		audioSrc,
		icon,
		text,
		title,
	}=data;

	audio_msg.src=audioSrc?audioSrc:"/files/sounds/ding.mp3";
	audio_msg.currentTime=0;
	if(audio_msg.paused) audio_msg.play();
	if(navigator.vibrate){
		navigator.vibrate(5e2);
	}
	const notification=new Notification(title,{
		body: text,
		icon: icon?icon:location.protocol+"//"+location.host+"/files/img/icon/Chat/chat64.jpg",
	});
	const fn=()=>{
		audio_msg.currentTime=0;
		if(!audio_msg.paused) audio_msg.pause();
	}
	notification.onclick=fn;
	notification.onclose=fn;
	notification.onerror=err=>{
		console.log("Notification Error:",err);
		Notification.requestPermission();
	};
}
function leaveChatroom(){
	socket.emit("leave-chatroom");
	actions.setChatroom(null);
	actions.clearHistory();
	actions.setView("chatrooms");
}
function changeChatroom(chatroom,password){
	socket.emit("change-chatroom",chatroom,password,([success,error_code,error_message])=>{
		if(success){
			actions.setChatroom(chatroom);
			actions.clearHistory();
			actions.setView("chat");
			console.log("new Chatroom: "+chatroom);
		}
		else{
			alert(error_code+"\n"+error_message);
			//actions.setView("chatrooms");
		}
	});
}

function ViewChat({socket,state,actions}){return[
	node_dom("h1[innerText=Chat][className=center]",{
		title: socket.connected?"":"Nicht verbunden!",
		S:{
			color: socket.connected?"":"red",
		},
	}),
	node_dom("h2[className=center]",{
		innerText: "Chatraum: "+state.chatrooms.find(item=>item.id===state.chatroom).name,
	}),

	state.account&&
	node_dom("div[className=chat]",null,[
		node_map(Message,state.history,{
			username: state.account.username,
		}),
	]),
	!state.account&&
	node_dom("h2[innerText=Kein Account!]"),

	node_dom("form",{
		onsubmit:(event)=>{
			event.preventDefault();
			const id=Date.now();
			const msg=state.msg.trim();
			if(!msg) return;
			socket.emit("msg",{msg,id},success=>{
				actions.changeHistory({id,success});
			});
			actions.appendHistory({
				id,
				msg,
				type: "msg",
				user: state.account,
				success: false,
			});
			actions.setMsg("");
		}
	},[
		node_dom("p[style=display:flex;]",null,[
			node_dom("input[type=text][autofocus][autocomplete=off][maxlength=10000][mozactionhint=send][enterkeyhint=send][id=input_msg]",{
				oninput: event=> actions.setMsg(event.target.value),
				value: state.msg,
			}),
			node_dom("span[id=span_info]",{
				onclick:()=> actions.setView("info"),
			}),
			node_dom("button[innerText=>][id=button_send]"),
		]),
	]),
]}
function Message({I,username}){return[
	I.type==="msg"&&
	node_dom("div",{
		F:{
			msg: true,
			me: username===I.user.username,
			isSending: !I.success,
		},
	},[
		node_dom("h3[className=nickname]",{
			innerText: I.user.nickname,
		}),
		node_dom("p[className=text]",{
			innerText: I.msg,
		}),
		node_dom("p[className=time]",{
			innerText: getTime(I.id),
		},[
			!I.success&&
			node_dom("img[src=/files/img/gif/busyIRON.gif][align=top][style=max-height:20px;][title=Wird gesendet...]"),
		]),
	]),

	I.type==="info"&&
	node_dom("div[className=info]",null,[
		node_dom("p[className=text]",{
			innerText: I.msg,
		}),
		node_dom("p[className=time]",{
			innerText: getTime(I.id),
		}),
	]),

	I.type==="small"&&
	node_dom("div[className=small]",null,[
		node_dom("p[className=text]",{
			innerText: I.msg,
		}),
	]),
]}

function ViewInfo({socket,state,actions}){return[
	node_dom("h1[className=withButton]",null,[
		node_dom("button[innerText=💬]",{
			onclick:()=> actions.setView("chat"),
		}),
		node_dom("button[innerText=🚪]",{
			onclick: leaveChatroom,
		}),
		node_dom("span[innerText=Info]"),
	]),
	/*node_dom("textarea",{
		innerText: JSON.stringify(state.clients)+"\n\n"+JSON.stringify(state.chatrooms),
	}),*/
	node_dom("div",null,[
		node_map(ChatroomEntry,state.chatrooms,{state,actions}),
	]),
	
]}
function ChatroomEntry({I,state,actions}){return[
	state.clients.filter(item=>item.chatroom===I.id).length>0&&
	node_dom("fieldset[className=chatroom_clientList]",null,[
		node_dom("legend",{
			innerText: I.name,
		}),
		node_dom("ul",null,[
			node_map(ClientEntry,state.clients.filter(item=>item.chatroom===I.id),{actions,state}),
		]),
		
	]),
]}
function ClientEntry({I,state,actions}){return[
	node_dom("li",{
		innerText: I.user.nickname+" ",
		title: I.user.username,
	}),
]}

function ViewChatrooms({state,actions}){return[
	node_dom("h1[innerText=Chaträume][title=Chatrooms]"),
	node_dom("div",null,[
		node_map(Chatroom,state.chatrooms,{state,actions}),
	]),
]}
function Chatroom({I,state,actions}){return[
	node_dom("p",{
		onclick:()=>{
			changeChatroom(
				I.id,
				I.password
				?	prompt("Passwort für "+I.name)
				:	null
			);
		},
	},[
		node_dom("a",{
			innerText: I.name,
			href: "#"+I.id,
			onclick: e=>e.preventDefault(),
		})
	]),
]}

init(()=>{
	const [state,actions]=hook_model(model);
	const audio_msg=hook_memo(()=>new Audio("/files/sounds/ding.mp3"));
	const socket=hook_memo(()=>{
		const token=getToken();
		if(!token){
			if(confirm("Sie sind NICHT angemeldet. Der Chat kann nur mit einem Account verwendet werden. Klicken Sie jetzt auf OK, um sich anzumelden!")) location.href="/account?goto=Chat";
			else history.back();
			return;
		}
		const [username,nickname]=atob(unescape(token)).split("|");
		actions.setAccount({username,nickname});
		return io({
			path: "/bind/socket/Chat",
			auth: {token},
		});
	});
	hook_effect(()=>{
		Notification.requestPermission();

		window.socket=socket;
		window.audio_msg=audio_msg;
		window.actions=actions;

		socket.on("connect",()=>{
			actions.setConnected(true);
		});
		socket.on("disconnect",()=>{
			actions.setConnected(false);
		});
		socket.on("error_code",code=>{
			if(code=="wrong-token"){
				alert("Sie sind NICHT angemeldet. Der Chat kann nur mit einem Account verwendet werden. Klicken Sie jetzt auf OK, um sich anzumelden!");
				location.href="/account?goto=Chat";
			}
		});
		socket.on("msg",data=>{
			const {msg,id,user}=data;
			actions.appendHistory({
				id,
				msg,
				type: "msg",
				user,
			});
		});
		socket.on("clients-connected",actions.setClients);
		socket.on("user-change-chatroom",actions.changeChatroom_fromOther);
		socket.on("user-connect",client=>{
			//actions.appendClient(client);
			actions.appendHistory({
				user: client.user,
				msg: client.user.nickname+" bettritt den Chatraum!",
			});
			sendMessage({
				title: "Chat Raum Betreten",
				text: client.user.nickname+" bettritt den Chatraum!",
			});
		});
		socket.on("user-disconnect",client=>{
			//actions.removeClient(client.id);
			actions.appendHistory({
				user: client.user,
				msg: client.user.nickname+" Verlässt den Chatraum!",
			});
			sendMessage({
				title: "Chat Raum Verlassen",
				text: client.user.nickname+" Verlässt den Chatraum!",
			});
		});
		socket.on("user-online",client=>{
			actions.appendClient(client);
			actions.appendHistory({
				user: client.user,
				msg: client.user.nickname+" ist Online!",
			});
			sendMessage({
				title: "Online",
				text: client.user.nickname+" ist Online!",
			});
		});
		socket.on("user-offline",client=>{
			actions.removeClient(client.id);
			actions.appendHistory({
				user: client.user,
				msg: client.user.nickname+" ist Offline!",
			});
			sendMessage({
				title: "Offline",
				text: client.user.nickname+" ist Offline!",
			});
		});
		socket.on("chatrooms",actions.setChatrooms);
	});
	hook_effect(()=>{
		if(state.view==="chat"){
			setTimeout(()=>{
				document.scrollingElement.scrollTop=9e9;
			},0);
		}
	},[
		state.history.length,
	]);
	hook_effect(()=>{
		const entry=state.history[state.history.length-1];
		if(
			entry&&
			entry.type==="msg"&&
			entry.user.username!==state.account.username&&
			document.hidden
		){
			sendMessage({
				title: entry.user.nickname+" schreibt",
				text: entry.msg,
			});
		}
	},[
		state.history.length,
	]);
	hook_effect(actions.setNotificationPermission,[Notification.permission]);

	return[null,[
		state.view==="chatrooms"&&
		node(ViewChatrooms,{socket,state,actions}),

		state.view==="chat"&&
		node(ViewChat,{socket,state,actions}),

		state.view==="info"&&
		node(ViewInfo,{socket,state,actions}),
	]];
});
