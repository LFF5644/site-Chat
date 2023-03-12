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
		connected: false,
		history: [],
		msg: "",
		view: "chat",
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
				type: "info",
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
	setAccount:(state,data)=>({
		...state,
		account: data,
	}),
	setView:(state,data)=>({
		...state,
		view: data,
	}),
	setMsg:(state,data)=>({
		...state,
		msg: data,
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
function ViewChat({socket,state,actions}){return[
	node_dom("h1[innerText=Chat][id=h1_chat]",{
		title: socket.connected?"":"Nicht verbunden!",
		S:{
			color: socket.connected?"unset":"red",
		},
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
			const msg=state.msg;
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
			node_dom("input[type=text][autofocus][autocomplete=off][maxlength=10000][required][mozactionhint=send][enterkeyhint=send][id=input_msg]",{
				oninput: event=> actions.setMsg(event.target.value),
				value: state.msg,
			}),
			node_dom("img[src=/files/img/settingsIconBlack32_box.jpg][alt=info][style=margin-right:5px;]",{
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

init(()=>{
	const [state,actions]=hook_model(model);
	const audio_msg=hook_memo(()=>new Audio("/files/sounds/ding.mp3"));
	const socket=hook_memo(()=>{
		const token=getToken();
		if(!token){
			alert("Sie sind NICHT angemeldet. Der Chat kann nur mit einem Account verwendet werden. Klicken Sie jetzt auf OK, um sich anzumelden!");
			location.href="/account?goto=Chat";
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
		window.socket=socket;
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
	});
	hook_effect(()=>{
		console.log("CHANGE!");
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
			audio_msg.currentTime=0;
			if(audio_msg.paused) audio_msg.play();
		}
	},[
		state.history.length,
	]);

	return[null,[
		state.view==="chat"&&
		node(ViewChat,{socket,state,actions}),
	]];
});
