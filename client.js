var socket = io.connect(window.location.origin);

Ext.DomHelper.useDom = true; // prevent XSS
 
//var socket = io.connect("http://localhost");
socket.on("userlist", function(content){
	console.log("client userlist");	
	Ext.fly("users").createChild({
		tag: "li",
		children: [content]
	});
});
Ext.onReady(function(){
	Ext.fly("submit").on("click", function(){
		// When the "send" button is clicked, emit a "message" event to the server containing a chat message
               console.log("submit clicked"); 
               var user = {username:Ext.fly("username").getValue()};
               

		socket.emit("username", user);
	});
});

