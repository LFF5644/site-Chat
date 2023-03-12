const socketIo=require("socket.io");
const services={
	account: service_require("server/account/account.new"),
}

this.start=()=>{
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
			token,
			account: null,
			accountIndex: null,
			//socket,
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
		
		socket.broadcast.emit("user-connect",{
			socketId,
			user:{
				username: client.account.username,
				nickname: client.account.nickname,
			},
		});
		const clients_send={};
		for(let key of Object.keys(this.clients)){
			const client=this.clients[key];
			//console.log(client);
			try{
				clients_send[key]={
					user:{
						username: client.account.username,
						nickname: client.account.nickname,
					},
				};
			}catch(e){}
		}
		socket.emit("clients-connected",clients_send);
		socket.on("send-msg",(data,cb)=>{
			const {msg,id}=data;
			const client=this.clients[socket.id];
			if(!client.token) return;
			socket.broadcast.emit("receive-msg",{
				socketId,
				user:{
					username: client.account.username,
					nickname: client.account.nickname,
				},
				id: id?id:Date.now(),
				msg,
			});
			cb(true);
		});
		socket.on("disconnect",()=>{
			const client=this.clients[socket.id];
			if(client.account){
				socket.broadcast.emit("user-disconnect",{
					socketId: socket.id,
					user:{
						username: client.account.username,
						nickname: client.account.nickname,
					},
				});
			}
			this.clients[socket.id]=undefined;
		});
	});
}
this.changeClientObject=(socketId,key,to)=>{
	this.clients[socketId][key]=to;
	return this.clients[socketId];
}
this.stop=()=>{
	this.io.close();
}