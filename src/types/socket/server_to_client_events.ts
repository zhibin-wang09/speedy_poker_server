import { GameState } from "../response_types/updated_game_response";

export interface ServerToClientEvents{
    "game:update": (gameState: GameState | undefined) => void;
    "game:result": (result: string) => void;
    "user:joined": (gameID: string) => void;
    "game:start": () => void;
    "game:disconnect": (msg: string) => void;
}