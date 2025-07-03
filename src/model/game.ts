import { Card, CARD_HOLDER, Cards, Deck, Pile } from "@/types/constant";
import { Destination, FaceValue, PlayerId, Validality } from "@/types/enums";
import { Player } from "./player";
import { createDeck, dealCards, getFaceValue, shuffle } from "@/utils/card";
import { GameState } from "@/types/response_types/updated_game_response";

export class Game {
  gameID: number;
  player1: Player = new Player([], [], 1);
  player2: Player = new Player([], [], 2);
  centerPile1: Pile = [];
  centerPile2: Pile = [];
  centerDrawPile1: Pile = [];
  centerDrawPile2: Pile = [];
  discardedPile: Pile = [];
  numberOfPlayers: number = 0;

  constructor(gameID: number) {
    while (this.checkIsDead()) {
      let player1: Player;
      let player2: Player;

      let deck: Deck = createDeck();
      player1 = new Player(dealCards(deck, 4), dealCards(deck, 16), 1);
      player2 = new Player(dealCards(deck, 4), dealCards(deck, 16), 2);
      this.player1 = player1;
      this.player2 = player2;
      this.centerPile1 = dealCards(deck, 1);
      this.centerPile2 = dealCards(deck, 1);
      this.centerDrawPile1 = dealCards(deck, 5);
      this.centerDrawPile2 = dealCards(deck, 5);
    }

    this.gameID = gameID;
  }

  useCard(card: Card, player: Player): GameState | undefined {
    let index: number = player.hand.indexOf(card);
    let targetCard: Card = player.hand[index];
    let destination: Destination = Destination.CenterPile2;
    let result: Validality = this.validateMove(
      this.centerPile1[0],
      this.centerPile2[0],
      targetCard
    );
    let gamePlayer: Player = new Player([], [], PlayerId.Default);
    // find the game player
    if (player.playerID === PlayerId.Player1) {
      gamePlayer = this.player1;
    } else if (player.playerID === PlayerId.Player2) {
      gamePlayer = this.player2;
    }

    if (gamePlayer.playerID === PlayerId.Default) {
      return;
    }

    // find if the card can be used in this environment
    if (result == Validality.CENTER1VALID) {
      destination = Destination.CenterPile1;
    } else if (result == Validality.INVALID) {
      if (gamePlayer.point > 0) gamePlayer.point -= 0.5;
      return {
        game: this,
        playerTurn: PlayerId.Default,
        cardIndex: -1,
        destination: 0,
        newCard: -1,
      };
    }

    let newCard: Card =
      player.drawPile.length > 0 ? player.drawPile[0] : CARD_HOLDER;
    let copy = [...player.hand];
    if (newCard !== CARD_HOLDER) {
      copy[index] = newCard;
    } else {
      copy = [...player.hand.slice(0, index), ...player.hand.slice(index + 1)];
    }

    gamePlayer.hand = copy;
    gamePlayer.drawPile =
      player.drawPile.length > 0 ? player.drawPile.slice(1) : player.drawPile;
    if (gamePlayer.hand.length == 0) {
      gamePlayer.point += 5;
    }

    // place the card in the desination pile
    if (destination == Destination.CenterPile1) {
      this.centerPile1 = [targetCard, ...this.centerPile1];
    } else {
      this.centerPile2 = [targetCard, ...this.centerPile2];
    }
    gamePlayer.point += 1;
    this.discardedPile.push(targetCard);
    this.shuffleUntilNotDead();

    return {
      game: this,
      playerTurn: gamePlayer.playerID,
      cardIndex: index,
      destination: destination,
      newCard: player.drawPile.length > 0 ? newCard : -1,
    };
  }

  shuffleUntilNotDead() {
    let isDead = this.checkIsDead();

    while (isDead) {
      // If center draw piles are empty, redistribute from center piles
      if (
        this.centerDrawPile1.length === 0 ||
        this.centerDrawPile2.length === 0
      ) {
        let combinedCenterPile = [...this.centerPile1, ...this.centerPile2];

        if (combinedCenterPile.length === 0) {
          console.warn("No cards left to reshuffle. Game might be stuck!");
          return; // Prevent infinite loop
        }

        shuffle(combinedCenterPile);
        let halfIndex = Math.ceil(combinedCenterPile.length / 2);
        this.centerDrawPile1 = combinedCenterPile.slice(0, halfIndex);
        this.centerDrawPile2 = combinedCenterPile.slice(halfIndex);
        this.centerPile1 = [];
        this.centerPile2 = [];
      }

      // Move the top card of the center draw piles to the center piles
      if (this.centerDrawPile1.length > 0) {
        this.centerPile1.unshift(this.centerDrawPile1.shift()!);
      }
      if (this.centerDrawPile2.length > 0) {
        this.centerPile2.unshift(this.centerDrawPile2.shift()!);
      }

      // **Recalculate `isDead` after making changes**
      isDead = this.checkIsDead();
    }
  }

  playerJoin(playerName: string, socketID: string) {
    if (!this.player1.socketID) {
      this.player1.socketID = socketID;
      this.player1.name = playerName;
      this.numberOfPlayers += 1;
    } else if (!this.player2.socketID && this.player1.socketID !== socketID) {
      this.player2.socketID = socketID;
      this.player2.name = playerName;
      this.numberOfPlayers += 1;
    }
  }

  checkIsDead(): boolean {
    const players =
      Math.random() < 0.5
        ? [this.player1, this.player2]
        : [this.player2, this.player1]; // Randomize order

    for (const player of players) {
      for (const c of player.hand) {
        if (
          this.validateMove(this.centerPile1[0], this.centerPile2[0], c) !==
          Validality.INVALID
        ) {
          return false; // A valid move exists, game is NOT dead
        }
      }
    }

    return true; // No valid moves, game is dead
  }

  validateMove(
    centerPile1TopCard: Card | undefined,
    centerPile2TopCard: Card | undefined,
    card: Card
  ): Validality {
    if (centerPile1TopCard === undefined && centerPile2TopCard === undefined) {
      return Validality.INVALID; // No cards to compare against
    }

    const cardFaceValue = getFaceValue(card);
    const center1Value =
      centerPile1TopCard !== undefined
        ? getFaceValue(centerPile1TopCard)
        : null;
    const center2Value =
      centerPile2TopCard !== undefined
        ? getFaceValue(centerPile2TopCard)
        : null;

    const twoAndAceDiff = Object.keys(FaceValue).length / 2 - 1; // Difference between Ace and 2

    if (center1Value !== null && Math.abs(center1Value - cardFaceValue) === 1) {
      return Validality.CENTER1VALID;
    }
    if (center2Value !== null && Math.abs(center2Value - cardFaceValue) === 1) {
      return Validality.CENTER2VALID;
    }
    if (
      center1Value !== null &&
      Math.abs(center1Value - cardFaceValue) === twoAndAceDiff
    ) {
      return Validality.CENTER1VALID;
    }
    if (
      center2Value !== null &&
      Math.abs(center2Value - cardFaceValue) === twoAndAceDiff
    ) {
      return Validality.CENTER2VALID;
    }

    return Validality.INVALID;
  }

  winner(): Player[]{
    // return player array [], index 0 is winner, index 1 is loser
    if(this.player1.hand.length != 0 && this.player2.hand.length != 0){
      return [];
    }else{
      let player1Point = this.player1.point;
      let player2Point = this.player2.point;

      // when both player have same points, whoever finishes first wins
      if(this.player1.hand.length == 0){
        // player 1 finished first
        return player1Point - player2Point >= 0 ? [this.player1, this.player2] : [this.player2, this.player1];
      }else{
        // player 2 finished first
        return player2Point - player1Point >= 0 ? [this.player2, this.player1] : [this.player1, this.player2];
      }
    }
  }
}