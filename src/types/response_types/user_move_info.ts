import { Player } from "@/model/player";
import { Card } from "../constant";

export interface userMoveInfo {
  card: Card;
  gameID: number;
  player: Player;
}
