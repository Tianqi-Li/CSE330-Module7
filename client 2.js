Ext.DomHelper.useDom = true; // prevent XSS
 
var socket = io.connect(window.location.origin);

window.addEventListener("paddlehit-left", function(e){
	// e.detail.hit will be true if the client hit the ball with his/her paddle.
	if (e.detail.hit) {
		console.log("HIT PADDLE.  New angle: %f", e.detail.angle); // log a message to the console
 
		// Tell our opponent via Socket.IO about the ball's new angle and position:
		socket.emit("reflect", {
			"angle": e.detail.angle,
			"position": e.detail.position
		});
 
		// Note: The game automatically launches the ball and determines the angle based on the ball's position relative to the paddle position.  We therefore do not need to call pong.launch() in here (but our opponent will, as shown below).
	}else{
		console.log("MISSED PADDLE");
 
		// in here, we will update the score, check for victory condition, launch a new ball (perhaps after a timeout), etc.
		socket.emit("missPaddle");
	}
});

window.addEventListener("paddlemove", function(e){
	// tell the server the player's new position
	socket.emit("paddleMoved", {
		"position": e.detail.position
	});
});

// Listen for the "opp-paddleMoved" message from the server
socket.on("opp-paddleMoved", function(data){
	pong.updateOpponentPaddle(data.position);
});

// Listen for the "reflect" message from the server
socket.on("reflect", function(data){
	// In order to make up for any network lag, immediately move the ball to its correct position:
	pong.resetBall(960, data.position);
 
	// Finally, launch the ball on our local game client:
	pong.launch(data.angle, -1);
});

// Listen for the "increaseScore" message from the server, show the increased score
socket.on("increaseScore", function(data){
	console.log("Your score is: " + data.leftScore);
	console.log("Your opponent score is: " + data.rightScore);
	var score = {};
	score.left = data.leftScore;
	score.right = data.rightScore;
	pong.setScore(score);	
});

// Listen for the "restartGame" message from the server
socket.on("restartGame", function(){
	var initAngle = -60 + 120*Math.random();
		 
		// randomly choose the initial direction of the ball:
	var initDirection = Math.random() < 0.5 ? -1 : 1;
		
	pong.pauseOrResumeGame();
	setTimeout(function(){pong.pauseOrResumeGame();},1000);
	
	pong.resetBall();
		 
		// set the ball into motion:
	pong.launch(initAngle, initDirection);
	
	socket.emit("restartgame2", {"initAngle": initAngle, "initDirection":initDirection});
	
	
	
});


socket.on("updateList", function(content){
	document.getElementById("waitingList").style.display = "block";
	var users = document.getElementById("players");
        users.innerHTML = "";
        for(var i=0; i<content.length; i++) {
            var user=document.createElement("li");
            user.innerHTML=content[i];
            users.appendChild(user);
        }
});

socket.on("newUserCreated",function(content){
	document.getElementById("waitingList").style.display = "block";
	document.getElementById("newUser").style.display = "none";
	
	document.getElementById("testMessege").innerHTML = "Welcome " + content;
});

socket.on("newUserDenied",function(){
	alert("This username has been taken!");
});

socket.on("challenge-ask", function(content){
	// Ask the opponent if they want to play
        var a = confirm("Do you want to play with " + content + "?");
	if (a===true) {
		document.getElementById("waitingList").style.display = "none";
		document.getElementById("gameControl").style.display = "block";
		socket.emit("challenge-accepted",content);
		
		// generate an initial angle between -60 degrees and +60 degrees:
		var initAngle = -60 + 120*Math.random();
		 
		// randomly choose the initial direction of the ball:
		var initDirection = Math.random() < 0.5 ? -1 : 1;
		 
		// show the game canvas:
		document.getElementById("gameContainer").style.display = "block";
		 
		// initialize the game canvas:
		pong.init();
		 
		// move the ball to the center:
		pong.resetBall();
		 
		// set the ball into motion:
		pong.launch(initAngle, initDirection);
		 
		// tell the server about the ball's initial angle and direction.  For example:
		socket.emit("initGame",{
			"angle": initAngle,
			"direction": initDirection
		});
		
	}
});

socket.on("gameBegin", function(content){
	document.getElementById("waitingList").style.display = "none";
	document.getElementById("gameControl").style.display = "block";
	// generate an initial angle between -60 degrees and +60 degrees:
		var initAngle = content.initAngle;
		 
		// randomly choose the initial direction of the ball:
		var initDirection = content.initDirection * (-1);
		 
		// show the game canvas:
		document.getElementById("gameContainer").style.display = "block";
		 
		// initialize the game canvas:
		pong.init();
		
		console.log("pong init'd");
		 
		// move the ball to the center:
		pong.resetBall();
		 
		// set the ball into motion:
		pong.launch(initAngle, initDirection);

});


socket.on("gameBegin2", function(content){
	
	// generate an initial angle between -60 degrees and +60 degrees:
		var initAngle = content.initAngle;
		 
		// randomly choose the initial direction of the ball:
		var initDirection = content.initDirection * (-1);
		 
		// show the game canvas:
		//document.getElementById("gameContainer").style.display = "block";
		 
		// initialize the game canvas:
		//pong.init();
		
		console.log("pong init'd");
		 
		// move the ball to the center:
		pong.resetBall();
		 
		// set the ball into motion:
		pong.launch(initAngle, initDirection);

});

socket.on("win",function(){
	pong.pauseOrResumeGame();
	alert("You win");
	var a = confirm("Do you want to play again?");
	if (a===true) {
		socket.emit("challenge-sent",Ext.fly("opponent").getValue());
	}
	else {
		document.getElementById("gameContainer").style.display = "none";
		document.getElementById("waitingList").style.display = "block";
		document.getElementById("gameControl").style.display = "none";
	}
	
});

socket.on("lose",function(){
	alert("You lose");
	pong.pauseOrResumeGame();
	document.getElementById("gameContainer").style.display = "none";
	document.getElementById("waitingList").style.display = "block";
	document.getElementById("gameControl").style.display = "none";
});


socket.on("startGame",function(){
	if (pong.ready() !== true) {
		
		pong.pauseOrResumeGame();
	}
});

socket.on("pauseGame",function(){
	if (pong.ready() === true) {
		
		pong.pauseOrResumeGame();
	}
});

Ext.onReady(function(){
	Ext.fly("submit").on("click", function(){
		// When the "send" button is clicked, emit a "message" event to the server containing a chat message
		socket.emit("newUser", Ext.fly("username").getValue());
	});
	Ext.fly("begin").on("click", function(){
		socket.emit("challenge-sent",Ext.fly("opponent").getValue());
	});
	Ext.fly("start_btn").on("click",function(){
		
		socket.emit("startGame");
		
	});
	Ext.fly("pause_btn").on("click",function(){
		
		socket.emit("pauseGame");
		
	});
	Ext.fly("quit_btn").on("click",function(){
		socket.emit("quitGame");
	});
});
