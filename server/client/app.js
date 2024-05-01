/*var socket = new WebSocket("ws://localhost:8080");

socket.onmessage = function(event){
    var messagesList = document.querySelector('#messages-list');
    var newMessageEl = document.createElement('li');
    newMessageEl.innerHTML = event.data;
    messagesList.appendChild(newMessageEl);
}

var sendButton = document.querySelector('#send-button');
sendButton.onclick = function(){
    var messageInput = document.querySelector("#message-input");
    socket.send(messageInput.value);
}

*/

// for vue
// socket is a data member

// created function: this.socket = new WebSocket

Vue.createApp({

    data: function(){
        return{
            socket: null,
            guesses: [],
            answer: null,
            proposedAnswer: null,
            correctLetters: null,
            activeGame: false,
            player2IsReady: false,
            guess: null,
            fullGame: false,
            playerId: null,
            gameOver: false
        };
    },

    methods: {
        makeGuess: function(data){
            // send message to WS server
            var message = {
                action: 'guessLetter',
                guess: this.guess
            }

            console.log(message);

            this.guess = null;

            this.socket.send(JSON.stringify(message));
        },

        receiveMessage: function(data){
            // handle new incoming WS message
            if (data.action == 'updateBoard'){
                // do something for some action
            } else if(data.action == 'gameFull') {
                this.fullGame = true;
            } else if(data.action == 'updateLetters'){
                this.correctLetters = data.correctLetters;
                this.guesses = data.incorrectLetters;
            } else if(data.action == 'setPlayerId'){
                this.playerId = data.playerId;
            } else if (data.action == 'player2Ready'){
                this.player2IsReady = true;
                if (this.answer && this.player2IsReady){
                    this.activeGame = true;
                }
            } else if (data.action == 'setAnswer'){
                this.answer = data.answer;
            } else if (data.action == 'activateGame'){
                this.activeGame = true;
            } else if (data.action == 'restart'){
                this.activeGame = false;
                this.player2IsReady = false;
                this.answer = null;
                this.gameOver = false;
            } else if (data.action == 'gameOver'){
                this.gameOver = true;
                this.activeGame = false;
            } else if (data.action == 'userDisconnected'){
                this.guesses = [];
                this.answer = null;
                this.proposedAnswer = null;
                this.correctLetters = null;
                this.activeGame = false;
                this.player2IsReady = false;
                this.guess = null;
                this.gameOver = false;
            } else if (data.action == 'updatePlayerId'){
                if (this.playerId == 2){
                    this.playerId = 1;
                }
            }
        },

        setAnswer: function(data){

            this.answer = this.proposedAnswer;

            var message = {
                action: 'setAnswer',
                answer: this.answer
            }

            this.socket.send(JSON.stringify(message));
            this.proposedAnswer = null;

            if (this.player2IsReady && this.answer){
                this.activeGame = true;
                 var message = {
                    action: 'gameIsActive'
                 }
                 this.socket.send(JSON.stringify(message));
            }
        },

        player2Ready: function(data){
            this.player2IsReady = true;
            if (this.player2IsReady && this.answer){
                this.activeGame = true;
            }
            var message = {
                action: 'player2Ready',
            }

            this.socket.send(JSON.stringify(message));
        },

        startOver: function(data){

            var message = {
                action: 'startOver'
            }

            this.socket.send(JSON.stringify(message));
        }

    },

    created: function() {
        console.log("Hello, Vue.");
        this.socket = new WebSocket("wss://hangman-carsonr1chards.onrender.com/");
        //this.socket = new WebSocket("ws://localhost:8080");
        this.socket.onmessage = (event) => {
            this.receiveMessage(JSON.parse(event.data));
        };
    }

}).mount("#app");