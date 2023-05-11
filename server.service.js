const crypto=require("crypto");
const services={
	account: service_require("server/account/account.new"),
}
const socketIo=require("socket.io");

this.start=()=>{
	this.chatrooms=[
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
	this.clients={};

	this.io=socketIo(23863,{
		cors:{
			origin:"*",
		},
	});
	this.io.on("connect",socket=>{
		const token=socket.handshake.auth.token;
		const socketId=socket.id;
		this.clients[socketId]={
			//socket,
			account: null,
			accountIndex: null,
			chatroom: null,
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

		const send_clint={
			chatroom: client.chatroom,
			id: socketId,
			user:{
				username: client.account.username,
				nickname: client.account.nickname,
			},
		};
		socket.broadcast.emit("user-online",send_clint);
		socket.broadcast.to(client.chatroom).emit("user-connect",send_clint);
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
			socket.broadcast.to(client.chatroom).emit("msg",{
				id: socketId,
				user:{
					nickname: client.account.nickname,
					username: client.account.username,
				},
				id: id?id:Date.now(),
				msg,
			});
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
				socket.broadcast.to(chatroom_id).emit("user-connect",send_clint);
				this.changeClientObject(socket.id,"chatroom",chatroom_id);
				callback([true]);
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
	return crypto.createHash("sha256").update(content).digest(outputType);
}
this.stop=()=>{
	this.io.close();
}