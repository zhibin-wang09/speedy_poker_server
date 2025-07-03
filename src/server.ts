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
import { Player } from "@/model/player";
import { pino } from "pino";

const logger = pino();
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
  console.log(`user ${socket.id} joined`);

  socket.on("game:get", (gameID: number) => {
    // if the game was already created, join that game instead
    let existingGame = games.get(gameID);

    if (!existingGame) {
      console.log("ERROR!!!");
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

  socket.on("game:move", (card: Card, gameID: number, player: Player) => {
    console.log(card, gameID, player);
    let game = games.get(gameID);
    if (!game) {
      console.log("ERROR!!!");
      return;
    }

    let updatedGame = game.useCard(card, player);

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

    let [winner, loser] = game.winner();
    if (winner != undefined && loser != undefined) {
      io.to(winner.socketID).emit(
        "game:result",
        winner.name + " Won the Game!"
      );

      io.to(loser.socketID).emit(
        "game:result",
        loser.name + " Lose the Game!"
      );
    }

    io.sockets.in(String(gameID)).emit("game:update", updatedGame);
  });

  socket.on("user:join", (roomID: number, playerName: string) => {
    console.log(playerName);
    const roomIDString: string = String(roomID);

    // make sure players are restricted at 2
    if (io.sockets.adapter.rooms.get(roomIDString)?.size === 2) {
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

    console.log(`Room ID: ${roomIDString}`);
    console.log(`Player1 ID: ${game.player1.socketID}`);
    console.log(`Player2 ID: ${game.player2.socketID}`);

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

    console.log(`Room ID: ${roomIDString}`);
    console.log(`Player1 ID: ${game.player1.socketID}`);
    console.log(`Player2 ID: ${game.player2.socketID}`);

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
      socket._error("No Active Game");
    } else {
      game.playerJoin(playerName, socket.id);

      console.log(`Room ID: ${game.gameID}`);
      console.log(`Player1 ID: ${game.player1.socketID}`);
      console.log(`Player2 ID: ${game.player2.socketID}`);
      socket.join(String(game.gameID));
      socket.emit("user:joined", String(game.gameID));
    }
  });

  socket.on("user:ready", (gameID: number) => {
    // Wait for 2 players to start the game
    const room = io.sockets.adapter.rooms.get(String(gameID));
    console.log(`Player ready for: ${gameID}, room size: ${room?.size}`);
    if (room?.size === 2) {
      console.log("Start");
      io.sockets.in(String(gameID)).emit("game:start");
    }
  });

  socket.on("disconnect", () => {
    console.log(`user ${socket.id} left`);

    const game = socketToGame.get(socket.id);
    if (!game) {
      console.log("Did not find existing game when user exited");
      return;
    }
    socketToGame.delete(game.player1.socketID!);
    socketToGame.delete(game.player2.socketID!);
    games.delete(game.gameID);
    io.in(String(game.gameID)).socketsLeave(String(game.gameID));
    io.to(game.player1.socketID!).emit("game:disconnect", "An user have left");
    io.to(game.player2.socketID!).emit("game:disconnect", "An user have left");
  });
});

httpServer.listen(config.serverPort);
// WARNING !!! app.listen(3000); will not work here, as it creates a new HTTP server
