import express from "express";
import http from "http";
import { Server } from "socket.io";
import config from "@/config/config";
import { Game } from "@/model/game";
import { GameState } from "./types/response_types/updated_game_response";
import { PlayerId } from "./types/enums";
import { ClientToServerEvents } from "@/types/socket/client_to_server_events";
import { ServerToClientEvents } from "@/types/socket/server_to_client_events";
import { Card } from "@/types/constant";
import { logger } from "@/types/constant";

const app = express();
const httpServer = http.createServer(app);
const options = {
  /* ... */
};
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer);

const games = new Map<number, Game>();
const socketToGame = new Map<string, Game>();
const currentRoomIDs = new Set<string>();

io.on("connection", (socket) => {
  logger.info(`user ${socket.id} joined`);

  socket.on("game:get", (gameID: number) => {
    // if the game was already created, join that game instead
    let existingGame = games.get(gameID);

    if (!existingGame) {
      logger.error("Game does not exist");
      socket.emit("game:error", "Game does not exist!");
      return;
    }

    let res: GameState = {
      game: existingGame,
      playerTurn: PlayerId.Default,
      cardIndex: -1,
      destination: 0,
      newCard: -1,
    };

    socket.emit("game:update", res);
  });

  socket.on("game:move", (card: Card, gameID: number, playerId: PlayerId) => {
    logger.debug({ card, gameID, playerId }, "game:move");
    let game = games.get(gameID);
    if (!game) {
      logger.error("Game does not exist");
      socket.emit("game:error", "Game does not exist!");
      return;
    }

    let updatedGame = game.useCard(card, playerId);

    // if (game.player1.hand.length == 0 || game.player2.hand.length == 0) {
    //   if (game.player2.point > game.player1.point) {
    //     io.to(game.player2.socketID).emit(
    //       "game:result",
    //       game.player2.name + ` Lose the Game!`
    //     );
    //     io.to(game.player1.socketID).emit(
    //       "game:result",
    //       game.player1.name + " Won the Game!"
    //     );
    //     socketToGame.delete(game.player1.socketID!);
    //     socketToGame.delete(game.player2.socketID!);
    //     games.delete(game.gameID);
    //     io.in(String(game.gameID)).socketsLeave(String(game.gameID));
    //   } else if (game.player1.point > game.player2.point) {
    //     io.to(game.player1.socketID).emit(
    //       "game:result",
    //       game.player1.name + " Lose the Game!"
    //     );
    //     io.to(game.player2.socketID).emit(
    //       "game:result",
    //       game.player2.name + " Won the Game!"
    //     );
    //     socketToGame.delete(game.player1.socketID!);
    //     socketToGame.delete(game.player2.socketID!);
    //     games.delete(game.gameID);
    //     io.in(String(game.gameID)).socketsLeave(String(game.gameID));
    //   } else {
    //     io.to(game.player1.socketID).emit("game:result", "Tie game");
    //     io.to(game.player2.socketID).emit("game:result", "Tie game");
    //     socketToGame.delete(game.player1.socketID!);
    //     socketToGame.delete(game.player2.socketID!);
    //     games.delete(game.gameID);
    //   }
    // }
    //console.log(res);

    let result = game.winner();
    if (result != undefined) {
      io.to(result.winner.socketId).emit(
        "game:result",
        result.winner.name + " Won the Game!"
      );

      io.to(result.loser.socketId).emit("game:result", result.loser.name + " Lose the Game!");
    }

    io.sockets.in(String(gameID)).emit("game:update", updatedGame);
  });

  socket.on("user:join", (roomID: number, playerName: string) => {
    const roomIDString: string = String(roomID);

    // make sure players are restricted at 2
    if (io.sockets.adapter.rooms.get(roomIDString)?.size === 2) {
      socket.emit("game:error", "Game already reached two players!");
      return;
    }

    let gameID = Number(roomIDString);
    // Retrieve the game state or initialize it if it doesn't exist
    let game = games.get(gameID);

    if (!game) {
      socket._error("game does not exist, createa a game room instead");
      return;
    }

    // Set up the player socketID properly
    game.playerJoin(playerName, socket.id);

    logger.info(`Player Joined;Room ID: ${roomIDString}`);
    for (const player of game.players) {
      logger.info(`Player Joined;Player ID: ${player.socketId}`);
    }

    socket.join(roomIDString);
    socket.emit("user:joined", roomIDString);
  });

  socket.on("game:create", (playerName: string) => {
    // generate a random game room ID and send back to the user
    // and player can wait for another user to join
    const roomIDString: string = String(
      Math.floor(Date.now() * Math.random())
    ).slice(0, 5);
    const gameID: number = Number(roomIDString);
    let game = games.get(gameID);

    if (!game) {
      game = new Game(gameID);
      games.set(gameID, game); // Save the game immediately after initialization
    }

    // Ensure the game object is correctly associated with the socket
    socketToGame.set(socket.id, game);

    // Set up the player socketID properly
    game.playerJoin(playerName, socket.id);

    logger.info(`Game Create;Room ID: ${roomIDString}`);
    for (const player of game.players) {
      logger.info(`Game Created;Player ID: ${player.socketId}`);
    }
    socket.join(roomIDString);
    socket.emit("user:joined", roomIDString);
  });

  socket.on("user:join_any", (playerName: string) => {
    let game;
    for (let [_, g] of games) {
      if (g.numberOfPlayers < 2) {
        game = g;
      }
    }

    if (game == undefined) {
      socket.emit("game:error", "No active games!");
    } else {
      game.playerJoin(playerName, socket.id);

      logger.info(`Player Joined;Room ID: ${game.gameID}`);
      for (const player of game.players) {
        logger.info(`Player Joined;Player ID: ${player.socketId}`);
      }
      socket.join(String(game.gameID));
      socket.emit("user:joined", String(game.gameID));
    }
  });

  socket.on("user:ready", (gameID: number) => {
    // Wait for 2 players to start the game
    const room = io.sockets.adapter.rooms.get(String(gameID));

    logger.info(`Player ready for: ${gameID}, room size: ${room?.size}`);
    if (room?.size === 2) {
      logger.info(`Game start for ${gameID}`);
      io.sockets.in(String(gameID)).emit("game:start");
    }
  });

  socket.on("disconnect", () => {
    logger.info(`User ${socket.id} left`);

    const game = socketToGame.get(socket.id);
    if (!game) {
      logger.info("Did not find existing game when user exited");
      return;
    }

    for (const player of game.players) {
      socketToGame.delete(player.socketId!);
    }

    games.delete(game.gameID);
    io.in(String(game.gameID)).socketsLeave(String(game.gameID));

    for (const player of game.players) {
      io.to(player.socketId!).emit("game:disconnect", "An user have left");
    }
  });
});

httpServer.listen(config.serverPort, () => {
  logger.info("Server started");
});
// WARNING !!! app.listen(3000); will not work here, as it creates a new HTTP server
