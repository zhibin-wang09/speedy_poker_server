import express from "express";
import http from "http";
import { Server } from "socket.io";
import config from "@/config/config";
import { Game } from "@/model/game";
import { GameState } from "./types/response_types/updated_game_response";
import { PlayerId } from "./types/enums";
import { ClientToServerEvents } from "@/types/socket/client_to_server_events";
import { ServerToClientEvents } from "@/types/socket/server_to_client_events";
import { Card, games, socketToGame } from "@/types/constant";
import { logger } from "@/types/constant";
import initIo from '@/listener/server';

const app = express();
const httpServer = http.createServer(app);
const options = {
  /* ... */
};


const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer);
initIo(io);

// io.on("connection", (socket) => {
//   logger.info(`user ${socket.id} joined`);

//   socket.on("game:get", getGame(socket));

//   socket.on("game:move", gameMove(io, socket));

//   socket.on("user:join", userJoin(io, socket));

//   socket.on("game:create", (playerName: string) => {
//     // generate a random game room ID and send back to the user
//     // and player can wait for another user to join
//     const roomIDString: string = String(
//       Math.floor(Date.now() * Math.random())
//     ).slice(0, 5);
//     const gameID: number = Number(roomIDString);
//     let game = games.get(gameID);

//     if (!game) {
//       game = new Game(gameID);
//       games.set(gameID, game); // Save the game immediately after initialization
//     }

//     // Ensure the game object is correctly associated with the socket
//     socketToGame.set(socket.id, game);

//     // Set up the player socketID properly
//     game.playerJoin(playerName, socket.id);

//     logger.info(`Game Create;Room ID: ${roomIDString}`);
//     for (const player of game.players) {
//       logger.info(`Game Created;Player ID: ${player.socketId}`);
//     }
//     socket.join(roomIDString);
//     socket.emit("user:joined", roomIDString);
//   });

//   socket.on("user:join_any", (playerName: string) => {
//     let game;
//     for (let [_, g] of games) {
//       if (g.numberOfPlayers < 2) {
//         game = g;
//       }
//     }

//     if (game == undefined) {
//       socket.emit("game:error", "No active games!");
//     } else {
//       game.playerJoin(playerName, socket.id);

//       logger.info(`Player Joined;Room ID: ${game.gameID}`);
//       for (const player of game.players) {
//         logger.info(`Player Joined;Player ID: ${player.socketId}`);
//       }
//       socket.join(String(game.gameID));
//       socket.emit("user:joined", String(game.gameID));
//     }
//   });

//   socket.on("user:ready", (gameID: number) => {
//     // Wait for 2 players to start the game
//     const room = io.sockets.adapter.rooms.get(String(gameID));

//     logger.info(`Player ready for: ${gameID}, room size: ${room?.size}`);
//     if (room?.size === 2) {
//       logger.info(`Game start for ${gameID}`);
//       io.sockets.in(String(gameID)).emit("game:start");
//     }
//   });

//   socket.on("disconnect", () => {
//     logger.info(`User ${socket.id} left`);

//     const game = socketToGame.get(socket.id);
//     if (!game) {
//       logger.info("Did not find existing game when user exited");
//       return;
//     }

//     for (const player of game.players) {
//       socketToGame.delete(player.socketId!);
//     }

//     games.delete(game.gameID);
//     io.in(String(game.gameID)).socketsLeave(String(game.gameID));

//     for (const player of game.players) {
//       io.to(player.socketId!).emit("game:disconnect", "An user have left");
//     }
//   });
// });

httpServer.listen(config.serverPort, () => {
  logger.info("Server started");
});
// WARNING !!! app.listen(3000); will not work here, as it creates a new HTTP server
