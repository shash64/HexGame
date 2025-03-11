# Hex Game with JavaScript (Uni Project)

This project is a multiplayer game using Node.js, Express, D3.js, and Socket.io.
It allows players to connect, disconnect, send messages, and play a game on a hexagonal board.

# Features: 
- Player connection, disconnection, and management (names/ID/colors).
- Dynamic generation of a hexagonal board with D3.js.
- Real-time messaging (chat box).
- Interaction with hexagons on the board (clicks).

# Project Structure:
serveur_socket.io.js: Server file, it manages player connections and disconnections (including page closure), interactions (via the chat box and the game itself), and real-time synchronization.

client_socket.io.html: Client file, it includes the script to generate the board, handle events with the server, and display messages and other dynamic text.

styles.css: CSS file, it adds aesthetics to the HTML file to make the project and user experience more readable and intuitive.
