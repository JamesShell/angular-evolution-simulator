import { NeuralNetwork } from "./brain";
import * as Phaser from "phaser";

export class Creature {
  x: number;
  y: number;
  lastMoveX: number = 0;
  lastMoveY: number = 0;
  brain: NeuralNetwork | null;

  constructor(x: number, y: number, brain: NeuralNetwork | null) {
    this.x = x;
    this.y = y;
    this.brain = brain;
  }

  public nearestCreature(creatures: Creature[]): Creature {
    let closestCreature: Creature = this;
    let closestDistance = Number.MAX_VALUE;

    for (let creature of creatures) {
      const distance = Phaser.Math.Distance.Between(creature.x, creature.y, this.x, this.y);
      if (distance < closestDistance || closestCreature == this) {
        closestDistance = distance;
        closestCreature = creature;
      }
    }

    return closestCreature;
  }
}
