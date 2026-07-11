Chess.com Clone: Real-Time Multiplayer Chess Game
This repository contains the source code for a real-time multiplayer chess game inspired by Chess.com. Built with Node.js, Express.js, and Socket.io, the project enables real-time interactions between players. It also uses EJS for server-side rendering and chess.js to handle game logic and validate moves.

Features
Real-Time Multiplayer: Connect two players for live chess games with real-time updates using Socket.io.
Drag and Drop Gameplay: Intuitive drag-and-drop functionality for moving pieces on the chessboard.
Dynamic Player Roles:
The first two connected users are assigned as the white and black players.
Additional users can join as spectators.
Game State Synchronization:
The server manages and validates the game state using chess.js.
Real-time broadcasting of moves and board updates to all connected clients.
Responsive Chessboard Rendering:
Dynamically render the chessboard with accurate piece positions.
Flip the board view for the black player for a seamless experience.
Player Turn Validation: Ensure players can only move pieces during their turn.
Unicode Chess Pieces: Use Unicode symbols for a clean and lightweight rendering of chess pieces.
Technologies Used
Backend:

Node.js
Express.js
Socket.io
Chess.js
Frontend:

EJS (Embedded JavaScript templates) for server-side rendering
HTML, CSS, and JavaScript for UI/UX
Drag-and-drop API for piece movement
How It Works
Server Initialization:

Sets up an HTTP server with Express.js.
Establishes a WebSocket connection with Socket.io.
Manages the game state using chess.js.
Client Connection:

Assigns roles: "white", "black", or "spectator" based on availability.
Sends the initial board state (in FEN notation) to all clients.
Gameplay:

Players interact with the board via drag-and-drop.
Moves are validated server-side and broadcast to all clients.
Real-Time Updates:

The server ensures synchronized gameplay by sending updates (e.g., moves, turn changes) to all connected clients.
Disconnection Handling:

Frees up player roles when a client disconnects.
