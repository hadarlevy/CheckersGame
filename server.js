const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files (for React app)
app.use(express.static(path.join(__dirname, 'build')));

let players = 0;
let currentTurn = 'red'; // Default to red starting the game

// Handle new connections
io.on('connection', (socket) => {
  if (players >= 2) {
    socket.emit('gameFull', { message: 'The game is full.' });
    return;
  }

  players++;
  const playerColor = players === 1 ? 'red' : 'white';
  socket.emit('assignPlayer', { color: playerColor });

  // Notify other player that a new player has joined
  socket.broadcast.emit('playerJoined', { color: playerColor });

  socket.on('movePiece', (moveData) => {
    // Broadcast the move to the other player
    socket.broadcast.emit('updateBoard', moveData);
  });

  socket.on('resetGame', () => {
    // Notify both players to reset the game
    io.emit('resetBoard');
  });

  // Handle player disconnect
  socket.on('disconnect', () => {
    players--;
    io.emit('playerLeft', { message: 'A player has left the game.' });
  });
});

const port = process.env.PORT || 4000;
server.listen(port, () => console.log(`Server listening on port ${port}`));
