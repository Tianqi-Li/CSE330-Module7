// Require the functionality we need to use:
var http = require('http'),
 url = require('url'),
 path = require('path'),
 mime = require('mime'),
	path = require('path'),
	io = require("socket.io"),
	fs = require('fs');
 
// Make a simple fileserver for all of our static content.
// Everything underneath <STATIC DIRECTORY NAME> will be served.
var app = http.createServer(function(req, resp){
	var filename = path.join(__dirname, "static", url.parse(req.url).pathname);
	(fs.exists || path.exists)(filename, function(exists){
		if (exists) {
			fs.readFile(filename, function(err, data){
				if (err) {
					// File exists but is not readable (permissions issue?)
					resp.writeHead(500, {
						"Content-Type": "text/plain"
					});
					resp.write("Internal server error: could not read file");
					resp.end();
					return;
				}
 
				// File exists and is readable
				var mimetype = mime.lookup(filename);
				resp.writeHead(200, {
					"Content-Type": mimetype
				});
				resp.write(data);
				resp.end();
				return;
			});
		}else{
			// File does not exist
			resp.writeHead(404, {
				"Content-Type": "text/plain"
			});
			resp.write("Requested file not found: "+filename);
			resp.end();
			return;
		}
	});
});
app.listen(3456);

var userList = [];
var waitingNames = [];
var userSockets = [];//mapping of players and opponents
var waitingList = [];
// Do the Socket.IO magic:
io.listen(app).sockets.on("connection", function(socket){
	// This callback runs when a new Socket.IO connection is established.
	socket.on("newUser", function(content){
		// This callback runs when the client is created
		if (userList.indexOf(content) != -1) {
			socket.emit("newUserDenied");
		}
		else {
				socket.emit("newUserCreated",content);
				socket.username = content;
				socket.score = 0;
				userList.push(socket.username);
				userSockets.push(socket);
				waitingList.push(socket);
				waitingNames.push(socket.username);
				for(var i in waitingList) {
					waitingList[i].emit("updateList",waitingNames);
				}
		}
		
	});
	socket.on("challenge-sent", function(content){
		
		for (var i=0; i<waitingList.length; i++) {
			if (waitingList[i].username == content) {
				var oppSocket = waitingList[i];
				oppSocket.emit("challenge-ask", socket.username);//ask opponent if they want to play
			}
		}
		
	});
	
	socket.on("challenge-accepted", function(content){
		
		for (var i=0; i<waitingList.length; i++) {
			if (waitingList[i].username == content) {
				var userSocket = userSockets[i]; // this is the challenger
				// set opponent to both players
				socket.opponent = userSocket;
				userSocket.opponent = socket;
				// remove them from the waiting list
				//waitingList.splice(i, 1);
				//waitingNames.splice(i,1);
				//var index = waitingList.indexOf(socket);
				//waitingList.splice(index,1);
				//waitingNames.splice(index,1);
			}
		}
		
		for(var j=0; j<waitingList.length; j++) {
			waitingList[j].emit("updateList",waitingNames);
		}
	
	});
	
	socket.on("initGame",function(data){
		var oppSocket = socket.opponent;
		oppSocket.emit("gameBegin", {
			"initAngle":data.angle,
			"initDirection":data.direction
		});
	});
	
	//Listen for the "reflect" message from the client
	socket.on("reflect", function(data){
		// Tell our opponent about the reflection.
		socket.opponent.emit("reflect", data);
		
	});
	
	//Listen for the "paddleMoved" message from the client
	socket.on("paddleMoved", function(data){
		// Tell our opponent about the new position
		socket.opponent.emit("opp-paddleMoved", data);
	});
	
	//Listen for the "missPaddle" message from the client (increase score to the opponent)
	socket.on("missPaddle", function(){
		var socketOpp = socket.opponent;
		socketOpp.score = socketOpp.score + 1;
		console.log(socketOpp.score);
		
		socket.emit("increaseScore", {
			"leftScore": socket.score,        // user score
			"rightScore":socketOpp.score});   // opponent score (increase by 1)
		socket.opponent.emit("increaseScore", {
			"leftScore": socketOpp.score,      // opponent score (increase by 1)  
			"rightScore":socket.score	 // user score
		});  
		//Compute victory
		if (socketOpp.score == 5) {
			
			// opponent win the game, do something
			
			//socket.opponent = null;
			socket.score = 0;
			//socketOpp.opponent = null;
			socketOpp.score = 0;
			//waitingList.push(socket);
			//waitingList.push(socketOpp);
			//waitingNames.push(socket.username);
			//waitingNames.push(socketOpp.username);
			socketOpp.emit("win");
			socket.emit("lose");
			for(var i in waitingList) {
			//console.log("The waiting is: " + waitingList[i].username);
			waitingList[i].emit("updateList",waitingNames);
			}
		}
		
		//No one wins, update the score and restart the game
		else {
			socket.opponent.emit("restartGame");
		}
		
	});
	socket.on("restartgame2", function(data) {
		var socketUser = socket.opponent;
		socketUser.emit("gameBegin2",data);
	});
	
	socket.on("startGame",function(){
		var oppSocket = socket.opponent;
		oppSocket.emit("startGame");
		socket.emit("startGame");
	});
	
	socket.on("pauseGame",function(){
		var oppSocket = socket.opponent;
		oppSocket.emit("pauseGame");
		socket.emit("pauseGame");
	});
	
	socket.on("quitGame",function(){
		var oppSocket = socket.opponent;
		oppSocket.emit("win");
		socket.emit("lose");
		oppSocket.score = 0;
		socket.score = 0;
	});
	
});

