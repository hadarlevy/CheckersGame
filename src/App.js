import React, { useState, useEffect } from 'react';
import './App.css';
import io from 'socket.io-client';

const socket = io.connect('http://localhost:4000');

const Board = () => {
  const rows = 8;
  const cols = 8;
  const [pieces, setPieces] = useState(initializePieces());
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [player, setPlayer] = useState(null);
  const [turn, setTurn] = useState('red');

  useEffect(() => {
    socket.on('assignPlayer', ({ color }) => {
      setPlayer(color);
      if (color === 'white') {
        setTurn('white'); // White goes second
      }
    });

    socket.on('updateBoard', (moveData) => {
      handleRemoteMove(moveData);
    });

    socket.on('resetBoard', () => {
      setPieces(initializePieces());
      setTurn('red');
      setSelectedPiece(null);
      setValidMoves([]);
    });

    socket.on('playerJoined', ({ color }) => {
      alert(`${color} player has joined the game.`);
    });

    socket.on('playerLeft', ({ message }) => {
      alert(message);
    });

    return () => {
      socket.off();
    };
  }, []);

  function initializePieces() {
    const pieces = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < cols; col++) {
        if ((row + col) % 2 === 1) {
          pieces.push({ row, col, player: 'white' });
        }
      }
    }
    for (let row = 5; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if ((row + col) % 2 === 1) {
          pieces.push({ row, col, player: 'red' });
        }
      }
    }
    return pieces;
  }

  function handlePieceClick(row, col) {
    const piece = pieces.find(p => p.row === row && p.col === col);
    if (piece && piece.player === player && player === turn) {
      setSelectedPiece(piece);
      const moves = calculateValidMoves(piece);
      setValidMoves(moves);
    }
  }

  function calculateValidMoves(piece) {
    const moves = [];
    const direction = piece.player === 'red' ? -1 : 1;
    const basicMoves = [
      { row: piece.row + direction, col: piece.col - 1 },
      { row: piece.row + direction, col: piece.col + 1 }
    ];

    basicMoves.forEach(move => {
      if (isValidMove(move)) {
        moves.push({ ...move, capture: false });
      }
    });

    return moves;
  }

  function isValidMove(move) {
    if (move.row >= 0 && move.row < rows && move.col >= 0 && move.col < cols) {
      if ((move.row + move.col) % 2 === 1 && !pieces.some(p => p.row === move.row && p.col === move.col)) {
        return true;
      }
    }
    return false;
  }

  function handleMoveClick(row, col) {
    const move = validMoves.find(m => m.row === row && m.col === col);
    if (selectedPiece && move) {
      const updatedPieces = pieces.map(p =>
        p === selectedPiece ? { ...p, row, col } : p
      );

      setPieces(updatedPieces);
      socket.emit('movePiece', { selectedPiece, move });
      setTurn(turn === 'red' ? 'white' : 'red');
      setSelectedPiece(null);
      setValidMoves([]);
    }
  }

  function handleRemoteMove({ selectedPiece, move }) {
    const updatedPieces = pieces.map(p =>
      p.row === selectedPiece.row && p.col === selectedPiece.col
        ? { ...p, row: move.row, col: move.col }
        : p
    );

    setPieces(updatedPieces);
    setTurn(turn === 'red' ? 'white' : 'red');
  }

  function resetGame() {
    socket.emit('resetGame');
  }

  function renderSquare(row, col) {
    const isDark = (row + col) % 2 === 1;
    const piece = pieces.find(p => p.row === row && p.col === col);
    const isValidMove = validMoves.some(move => move.row === row && move.col === col);

    return (
      <div
        key={`${row}-${col}`}
        className={`square ${isDark ? 'dark' : 'light'} ${isValidMove ? 'valid-move' : ''}`}
        onClick={() => isValidMove ? handleMoveClick(row, col) : handlePieceClick(row, col)}
      >
        {piece && <div className={`piece ${piece.player}`}></div>}
      </div>
    );
  }

  const board = [];
  for (let row = 0; row < rows; row++) {
    const rowSquares = [];
    for (let col = 0; col < cols; col++) {
      rowSquares.push(renderSquare(row, col));
    }
    board.push(
      <div key={row} className="row">
        {rowSquares}
      </div>
    );
  }

  return (
    <div className="board">
      {board}
      <button onClick={resetGame}>Reset Game</button>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <h1>Multiplayer Checkers Game</h1>
      <Board />
    </div>
  );
}

export default App;
