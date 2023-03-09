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
		this.clients[socket.id]={
			token: null,
			account: null,
			accountIndex: null,
		};
		socket.emit("get-token");
		socket.on("get-token",token=>{
			this.clients[socket.id].token=token;
			const login=services.account.authUserByInput({
				token,
			});
			if(!login.allowed){
				socket.emit("account-err","wrong-token");
				socket.disconnect();
				return;
			}
			this.clients[socket.id].account=login.data.account;
			this.clients[socket.id].accountIndex=login.data.accountIndex;
			const client=this.clients[socket.id];
			socket.emit("get-myUser",{
				username: client.account.username,
				nickname: client.account.nickname,
			});
			socket.broadcast.emit("user-connect",{
				user:{
					username: client.account.username,
					nickname: client.account.nickname,
				},
			});
		});
		socket.on("send-msg",data=>{
			const {msg}=data;
			const client=this.clients[socket.id];
			if(!client.token) return;
			socket.broadcast.emit("receive-msg",{
				user:{
					username: client.account.username,
					nickname: client.account.nickname,
				},
				time: Date.now(),
				msg,
			});
			socket.emit("msg-sended");
		});
		socket.on("disconnect",()=>{
			const client=this.clients[socket.id];
			socket.broadcast.emit("user-disconnect",{
				user:{
					username: client.account.username,
					nickname: client.account.nickname,
				},
			});
			this.clients[socket.id]=undefined;
		});
	});
}
this.stop=()=>{

}