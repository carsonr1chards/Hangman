const WebSocket = require('ws')
const express = require('express');
const { raw } = require('express');

var answer = [];
var correctLetters = [];
var incorrectLetters = [];
var myClients = [];
var player2IsReady = false;
var activeGame = false;
var startOver = [false, false]

const app = express();

app.use(express.static("client"))

const server = app.listen(8080, () => {
    console.log('Server is running...');
  });

const wss = new WebSocket.WebSocketServer({ server });


let nextClientId = 1;

function generateClientId() {
    // Check if there's an open slot (1 or 2) in myClients array
    if (myClients.length === 0 || (myClients.length === 1 && myClients[0] === 2)) {
        return 1; // Assign client ID 1 if no clients or only client ID 2 exists
    } else if (myClients.length === 1 && myClients[0] === 1) {
        return 2; // Assign client ID 2 if only client ID 1 exists
    } else {
        return nextClientId++; // Assign next available client ID
    }
}

wss.on('connection', function connection(ws) {

    const clientId = generateClientId();

    console.log('Client connected with ID:', clientId);

    ws.clientId = clientId;

    if (answer.length != correctLetters.length){
        for (let i = 0; i < answer.length; i++){
            correctLetters.push(null);
        }
    }

    if (myClients.length < 2){
        myClients.push(ws.clientId);
        console.log(myClients);

        if(myClients.length == 2){
            sendActionToAllClients({
                action: "gameFull"
            })
        }
        sendActionToAllClients({
            action: "updateLetters",
            correctLetters: correctLetters,
            incorrectLetters: incorrectLetters
        })
        sendActionToOneClient(ws.clientId,{
            action: "setPlayerId",
            playerId: ws.clientId
        })
    } else {
        sendActionToAllClients({
            action: "gameFull"
        })
        return;
    }

    ws.on('error', console.error);

    ws.on('close', function() {
        console.log('Client disconnected with ID:', clientId);
        console.log(myClients);
    
        // Remove the disconnected client from the list of clients
        myClients = myClients.filter(client => client !== ws.clientId);
        console.log(myClients);
    
        // Check if the disconnected client had ID 1 or 2
        if (ws.clientId === 1 || ws.clientId === 2) {
            // Find the remaining client
            const remainingClient = myClients.find(client => client !== ws.clientId);
            console.log(myClients);

            for (let i = 0; i < 2; i++){
                if (myClients[i]){
                    if (myClients[i] != ws.clientId){

                        wss.clients.forEach(function(client) {
                            if (client.readyState === WebSocket.OPEN && client.clientId === myClients[i]) {
                                client.clientId = 1;
                            }
                        });

                        sendActionToAllClients({
                            action: "updatePlayerId",
                            playerId: 1
                        });
                        myClients[i] = 1;
                    }
                }
            }
            answer = [];
            correctLetters = [];
            incorrectLetters = [];
            player2IsReady = false;
            activeGame = false;
            startOver = [false, false];

            // Notify all clients about the disconnection
            sendActionToAllClients({
                action: "userDisconnected",
                clientId: ws.clientId
            });

        }
    });
    

    ws.on('message', function message(data) {
        const rawData = data.toString('utf8');
    
        var message = JSON.parse(data);
        console.log("The data:", message);
    
        if (message.action == "setAnswer" && message.answer) {
            for (let i = 0; i < message.answer.length; i++) {
                correctLetters.push(null);
                answer.push(message.answer[i].toLowerCase()); // Convert to lowercase
                sendActionToAllClients({
                    action: "updateLetters",
                    correctLetters: correctLetters,
                    incorrectLetters: incorrectLetters
                });
                sendActionToAllClients({
                    action: "setAnswer",
                    answer: answer
                });
            }
            return;
        }
    
        if (message.action == "guessLetter") {
            var correctGuess = false;
            for (let i = 0; i < answer.length; i++) {
                if (answer[i] === message.guess.toLowerCase()) { // Compare lowercase
                    correctLetters[i] = message.guess.toLowerCase(); // Store as lowercase
                    correctGuess = true;
                    console.log(correctLetters, answer);
                    if (JSON.stringify(correctLetters) === JSON.stringify(answer)) {
                        sendActionToAllClients({
                            action: "gameOver"
                        });
                    }
                }
            }
            if (!correctGuess) {
                incorrectLetters.push(message.guess.toLowerCase()); // Store as lowercase
                if (incorrectLetters.length >= 6) {
                    sendActionToAllClients({
                        action: "gameOver"
                    });
                }
            }
        }
    

        if (message.action == "player2Ready"){
            sendActionToAllClients({
                action: "player2Ready"
            })
        }

        if (message.action == 'gameIsActive'){
            sendActionToAllClients({
                action: 'activateGame'
            })
        }

        if (message.action == 'startOver'){
            startOver[ws.clientId - 1] = true;

            if (startOver[0] && startOver[1]){
                wss.clients.forEach(function(client){
                    if (client.clientId == 1){
                        client.clientId = 2;
                        sendActionToOneClient(ws.clientId,{
                            action: "setPlayerId",
                            playerId: ws.clientId
                        })
                        return;
                    } if (client.clientId == 2){
                        client.clientId = 1;
                        sendActionToOneClient(ws.clientId,{
                            action: "setPlayerId",
                            playerId: ws.clientId
                        })
                    }
                })
                answer = [];
                correctLetters = [];
                answer = [];
                correctLetters = [];
                incorrectLetters = [];

                sendActionToAllClients({
                    action: "updateLetters",
                    correctLetters: correctLetters,
                    incorrectLetters: incorrectLetters
                })

                sendActionToAllClients({
                    action: "restart"
                })

                startOver = [false, false];
            }
        }
        
        sendActionToAllClients({
            action: "updateLetters",
            correctLetters: correctLetters,
            incorrectLetters: incorrectLetters
        })
    })
})

function sendActionToAllClients(actionObject){
    var message = JSON.stringify(actionObject);
    wss.clients.forEach(function(client){
        if (client.readyState === WebSocket.OPEN){
            client.send(message);
        }
    })
}

function sendActionToOneClient(clientId, actionObject) {
    var message = JSON.stringify(actionObject);
    wss.clients.forEach(function(client) {
        if (client.readyState === WebSocket.OPEN && client.clientId === clientId) {
            client.send(message);
        }
    });
}

// wss.clients saves ordered array of when client connects this can be used to determine which client is communicating