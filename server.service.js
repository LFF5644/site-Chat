const {
	tofsStr,
}=globals.functions;

const fs=require("fs");
const crypto=require("crypto");

const services={
	account: service_require("server/account/account.new"),
}
const socketIo=require("socket.io");

const SAVE_INTERVAL=1e3*60; // autosave every minute.
const SAVE_FULL_INTERVAL=SAVE_INTERVAL*5; // saves each 5 hours all files force.
const CHATROOMS_FILE=			"data/chat/chatrooms.json";
const CHATROOM_MESSAGES_FILE=	"data/chat/chatroomMessages.json";

const chatroomMessagesInit=()=>{
	this.chatroomMessages=Object.fromEntries(
		this.chatrooms.map(item=>
			this.chatroomMessages[item.id]
			?	[item.id, this.chatroomMessages[item.id]]
			:	[item.id, []]
		)
	);
};
const shouldSave=value=>{
	this.shouldSave=this.shouldSave.filter(item=>item!==value);
	this.shouldSave.push(value);
}
this.start=()=>{
	this.lastSave=Date.now(); // set to now because we load the data its the same.
	this.shouldSave=[];
	this.chatrooms=[];
	this.chatroomMessages={};
	//this.privateMessages={}; // future update (TODO) xD
	this.clients={};

	loadChatrooms:{
		const default_chatrooms=[
			{
				createdDate: Date.now(),
				createdUser: null,
				description: "Öffentlicher Chatraum",
				id: "global",
				name: "Öffentlich",
				password: null,
			},
			{
				createdDate: Date.now(),
				createdUser: null,
				description: "Administrator Chatraum",
				id: "admin",
				name: "Admin only",
				password: this.createHash("4dm1n"),	// admin => 4dm1n
			},
		];
		try{
			this.chatrooms=JSON.parse(fs.readFileSync(CHATROOMS_FILE)); // using SYNC method because of old rtjscomp version.
		}catch(e){
			log("Error while loading "+CHATROOMS_FILE+", "+e.message);
			this.chatrooms=default_chatrooms;
		}
		try{
			this.chatroomMessages=JSON.parse(fs.readFileSync(CHATROOM_MESSAGES_FILE));
		}catch(e){
			log("Error while loading "+CHATROOM_MESSAGES_FILE+", "+e.message);
		}
		//console.log(this.chatroomMessages);
		chatroomMessagesInit();
		//console.log(this.chatroomMessages);
	}

	this.io=socketIo(23863,{
		allowEIO3: true,	// legacy clients allow to connect.
		cors:{
			origin:"*",
		},
	});
	this.io.on("connect",socket=>{
		let token;
		cookieCheck: if(Number(socket.handshake.query.EIO)<4){ // old client new ist "4"
			const cookies=socket.handshake.headers.cookie;
			if(!cookies) break cookieCheck;
			const cookie=cookies.split("; ").find(item=>item.startsWith("token="));
			if(cookie) token=unescape(cookie.substring(6));
		}
		else token=socket.handshake.auth.token;
		//console.log(socket.handshake);
		const socketId=socket.id;
		this.clients[socketId]={
			account: null,
			accountIndex: null,
			chatroom: null,
			socket,
			token,
		};
		let client=this.clients[socketId];
		const login=services.account.authUserByInput({token});
		if(!login.allowed||!token){
			socket.emit("error_code","wrong-token");
			socket.disconnect();
			return;
		}
		
		client=this.changeClientObject(socketId,"account",login.data.account);
		client=this.changeClientObject(socketId,"accountIndex",login.data.accountIndex);

		const send_client={
			chatroom: client.chatroom,
			id: socketId,
			user:{
				username: client.account.username,
				nickname: client.account.nickname,
			},
		};
		socket.broadcast.emit("user-online",send_client);
		socket.broadcast.to(client.chatroom).emit("user-connect",send_client);
		const clients_send=[];
		for(let key of Object.keys(this.clients)){
			const client=this.clients[key];
			if(key===socket.id) continue;
			if(client.account){
				clients_send.push({
					chatroom: client.chatroom,
					id: key,
					user:{
						nickname: client.account.nickname,
						username: client.account.username,
					},
				});
			}
		}
		socket.emit("clients-connected",clients_send);
		socket.emit("chatrooms",this.chatrooms.map(item=>({
			...item,
			password: item.password!==null,
		})));
		socket.on("msg",(data,cb)=>{
			const {msg,id}=data;
			const client=this.clients[socket.id];
			if(!client.token) return;
			const message_send={
				id: id?id:Date.now(),
				user:{
					nickname: client.account.nickname,
					username: client.account.username,
				},
				msg,
			};
			socket.broadcast.to(client.chatroom).emit("msg",message_send);
			this.chatroomMessages[client.chatroom].push(message_send);
			shouldSave("chatroomMessages");
			cb(true);
		});
		socket.on("change-chatroom",(chatroom_id,chatroom_password,callback)=>{
			const client=this.clients[socket.id];
			const success=()=>{
				const client_send={
					chatroom: chatroom_id,
					id: socket.id,
					user:{
						nickname: client.account.nickname,
						username: client.account.username,
					},
				};
				if(client.chatroom){
					socket.broadcast.to(client.chatroom).emit("user-disconnect",client_send);
					socket.leave(client.chatroom);
				}
				socket.join(chatroom_id);
				socket.broadcast.emit("user-change-chatroom",client_send);
				socket.broadcast.to(chatroom_id).emit("user-connect",client_send);
				this.changeClientObject(socket.id,"chatroom",chatroom_id);
				callback([
					true,
					this.chatroomMessages[chatroom_id].slice(0,50) // send the last 50 messages to client
				]);
			};

			const chatroom=this.chatrooms.find(item=>item.id===chatroom_id);

			if(chatroom===-1){
				callback([false,"not found","Raum nicht gefunden!"]);
				return;
			}

			if(chatroom.password===null) success();
			else{
				const passwordHash=this.createHash(chatroom_password);
				if(chatroom.password===passwordHash) success();
				else callback([false,"wrong password","Falsches Passwort!"]);
			}
		});
		socket.on("leave-chatroom",()=>{
			const client=this.clients[socket.id];
			socket.leave(client.chatroom);
			this.changeClientObject(socket.id,"chatroom",null);
			const client_send={
				chatroom: null,
				id: socketId,
				user:{
					nickname: client.account.nickname,
					username: client.account.username,
				},
			};
			socket.broadcast.emit("user-change-chatroom",client_send);
		});
		socket.on("add-chatroom",(chatroom_name,chatroom_password,chatroom_description,callback)=>{
			const client=this.clients[socket.id];
			const chatroom_id=tofsStr(chatroom_name);
			const chatroom={
				createdDate: Date.now(),
				createdUser: client.account.username,
				description: chatroom_description,
				id: chatroom_id,
				name: chatroom_name,
				password: chatroom_password?this.createHash(chatroom_password):null,
			};

			if(this.chatrooms.find(item=>item.id===chatroom_id)){
				callback([false,"Chatroom name existiert"]);
				return;
			}
			//if(!this.chatroomMessages[chatroom_id]) this.chatroomMessages[chatroom_id]=[]; // makes possible to restore chatroomMessages later.
			this.chatrooms.push(chatroom);
			chatroomMessagesInit();
			shouldSave("chatrooms");

			const chatroom_send={
				...chatroom,
				password: Boolean(chatroom.password),
			}
			socket.broadcast.emit("add-chatroom",chatroom_send);
			callback([true,chatroom_send]);

		});
		socket.on("delete-chatroom",(chatroom_id,chatroom_password,callback)=>{
			const client=this.clients[socket.id];
			const chatroom=this.chatrooms.find(item=>item.id===chatroom_id);

			if(!chatroom){
				callback([false,"Chatroom nicht gefunden"]);
				return;
			}
			else if(chatroom.createdUser!==client.account.username){
				callback([false,`Dieser Chatraum gehört "${chatroom.createdUser?this.createdUser:"SERVER"}" du hast keine rechte diesen zu Löschen!`]);
				return;
			}
			else if(
				chatroom.password!==null&&
				chatroom.password!==this.createHash(chatroom_password)
			){
				callback([false,"Falsches Passwort!"]);
				return;
			}

			// say clients that this room was deleted

			const sockets=(Object.keys(this.clients)
				.map(item=>this.clients[item])
				.filter(item=>item.chatroom===chatroom_id)
				.filter(item=>!console.log(item))
				.map(item=>item.socket)
			);
			for(const currentSocket of sockets){
				currentSocket.leave(chatroom_id);
				this.changeClientObject(currentSocket.id,"chatroom",null);
				const client_send={
					chatroom: null,
					id: currentSocket.id,
					user:{
						nickname: client.account.nickname,
						username: client.account.username,
					},
				};
				this.io.emit("user-change-chatroom",client_send);
			}

			this.chatrooms=this.chatrooms.filter(item=>item.id!==chatroom_id);
			socket.broadcast.emit("delete-chatroom",chatroom_id);
			callback([true,chatroom_id]);
		});
		socket.on("disconnect",()=>{
			const client=this.clients[socket.id];
			socket.leave(client.chatroom);
			if(client.account){
				const client_send={
					id: socket.id,
					user:{
						nickname: client.account.nickname,
						username: client.account.username,
					},
				};
				socket.broadcast.emit("user-disconnect",client_send);
				socket.broadcast.emit("user-offline",client_send);
			}
			delete this.clients[socket.id];
		});
	});
}
this.changeClientObject=(socketId,key,to)=>{
	this.clients[socketId][key]=to;
	return this.clients[socketId];
}
this.createHash=(content,outputType="hex")=>{
	return crypto.createHash("sha256").update(String(content)).digest(outputType);
}
this.save=required=>{
	const now=Date.now();
	const saveAllowed=now-this.lastSave>SAVE_INTERVAL;
	required=now-this.lastSave>SAVE_FULL_INTERVAL || required;

	if(!saveAllowed&&!required) return; // no save needed.

	if(required||this.shouldSave.includes("chatrooms")){
		log("Save: "+CHATROOMS_FILE);
		try{
			fs.writeFileSync(
				CHATROOMS_FILE,
				JSON.stringify(this.chatrooms,null,"\t")
			);
		}catch(e){
			log("Error while writing "+CHATROOMS_FILE+", "+e);
		}
	}
	if(required||this.shouldSave.includes("chatroomMessages")){
		log("Save: "+CHATROOM_MESSAGES_FILE);
		try{
			fs.writeFileSync(
				CHATROOM_MESSAGES_FILE,
				JSON.stringify(this.chatroomMessages,null,"\t")
			);
		}catch(e){
			log("Error while writing "+CHATROOM_MESSAGES_FILE+", "+e);
		}
	}

	this.lastSave=now+1e3*3;
	this.shouldSave=[];
}
this.stop=()=>{
	this.io.close();
	this.save(true);
}
