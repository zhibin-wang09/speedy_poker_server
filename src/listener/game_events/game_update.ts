import { Card, games, logger } from "@/types/constant";
import { PlayerId } from "@/types/enums";
import { GameState } from "@/types/response_types/updated_game_response";
import { ClientToServerEvents } from "@/types/socket/client_to_server_events";
import { ServerToClientEvents } from "@/types/socket/server_to_client_events";
import { DefaultEventsMap, Server, Socket } from "socket.io";

// only called one time when the game starts to initialize frontend
function getGame(
  socket: Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    DefaultEventsMap,
    any
  >
): (gameId: number) => void {
  return (gameID: number) => {
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
  };
}

function gameMove(
  io: Server<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, any>,
  socket: Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    DefaultEventsMap,
    any
  >
): (card: Card, gameID: number, playerId: PlayerId) => void {
  return (card: Card, gameID: number, playerId: PlayerId) => {
    logger.debug({ card, gameID, playerId }, "game:move");
    let game = games.get(gameID);
    if (!game) {
      logger.error("Game does not exist");
      socket.emit("game:error", "Game does not exist!");
      return;
    }

    let updatedGame = game.useCard(card, playerId);

    let result = game.winner();
    if (result != undefined) {
      io.to(result.winner.socketId).emit(
        "game:result",
        result.winner.name + " Won the Game!"
      );

      io.to(result.loser.socketId).emit(
        "game:result",
        result.loser.name + " Lose the Game!"
      );
    }

    io.sockets.in(String(gameID)).emit("game:update", updatedGame);
  };
}

export default function gameEvents(io: Server, socket: Socket) {
  const socketsEvents: Record<string, (...args: any[]) => void> = {
    "game:get": getGame(socket),
    "game:move": gameMove(io, socket),
  };

  for (const event in socketsEvents) {
    socket.on(event, socketsEvents[event]);
  }
}
