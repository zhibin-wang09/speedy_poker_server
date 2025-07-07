import { games, logger, socketToGame } from "@/types/constant";
import { ClientToServerEvents } from "@/types/socket/client_to_server_events";
import { ServerToClientEvents } from "@/types/socket/server_to_client_events";
import { Server } from "socket.io";
import gameEvents from "./game_events/game_update";
import { Game } from "@/model/game";
import userEvents from "./user_events/user_connection";

export default (io: Server<ClientToServerEvents, ServerToClientEvents>) => {
  io.on("connection", (socket) => {
    logger.info(`user ${socket.id} joined`);
    gameEvents(io, socket);
    userEvents(io, socket);
  });
};
