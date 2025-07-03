import { Cards, Pile } from "@/types/constant";
import { PlayerId } from "@/types/enums";

export class Player {
  hand: Cards = [];
  drawPile: Pile = [];
  playerID: PlayerId = PlayerId.Default;
  socketID: string;
  name: string;
  point: number;

  constructor(hand: Cards, drawPile: Pile, playerID: PlayerId) {
    this.hand = hand;
    this.drawPile = drawPile;
    this.playerID = playerID;
    this.name = "";
    this.socketID = "";
    this.point = 0.0;
  }

  setName(name: string) {
    this.name = name;
  }
}