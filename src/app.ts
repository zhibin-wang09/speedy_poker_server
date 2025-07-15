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


httpServer.listen(config.serverPort, () => {
  logger.info("Server started");
});
// WARNING !!! app.listen(3000); will not work here, as it creates a new HTTP server
