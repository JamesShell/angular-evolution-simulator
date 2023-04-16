import { Component, OnInit } from '@angular/core';
import { Creature } from "./models/creature";
import { NeuralNetwork, createNeuralNetwork, activateNeuralNetwork, connectionsToString } from "./models/brain";
import * as Phaser from 'phaser';


let creatures: { creature: Creature , sprite: Phaser.GameObjects.Sprite | null }[] = [];

@Component({
  selector: 'app-game',
  template: `<div id="game"></div>`
})
export class GameComponent {
  private game!: Phaser.Game;
  
  ngOnInit(): void {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 400,
      scene: {
        preload: this.preload,
        create: this.create,
        update: this.update
      },
      fps: {
        target: 10,
        forceSetTimeOut: true
      }
    };

    this.game = new Phaser.Game(config);

  }
  


  private preload() {
    const startingNeuronIds = ["Rnd", "Cld", "Lx", "Ly", "BD", "LMy", "LMx", "ND", "NDx", "NDy"];
    const actionNeuronIds = ["MXl", "MXr", "Mrv", "Mfd", "Mrn", "MYu", "MYd"];
    
    creatures = [
      {creature: new Creature(15, 19, createNeuralNetwork(startingNeuronIds, actionNeuronIds)), sprite: null },
      {creature: new Creature(0, 30, createNeuralNetwork(startingNeuronIds, actionNeuronIds)), sprite: null },
      {creature: new Creature(25, 40, createNeuralNetwork(startingNeuronIds, actionNeuronIds)), sprite: null },
    ]
  }

  private create() {
    // Server functions
    const scene = this.game.scene.getScene('default');
    const map = new Phaser.GameObjects.Container(scene, 4, 4);
    const players = new Phaser.GameObjects.Container(scene, 4, 4);
    const graphics = scene.make.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 8, 8);
    graphics.lineStyle(1, 0x000000);
    graphics.strokeRect(0, 0, 8, 8);
    graphics.generateTexture('square', 8, 8);

    let nonRenderedCreatures = [...creatures];
  
    for (let x = 0; x < (this.game.canvas.width/8); x++) {
      for (let y = 0; y < (this.game.canvas.height/8); y++) {
        const sprite = new Phaser.GameObjects.Sprite(scene, x * 8, y * 8, 'square');
        map.add(sprite);
        creatures.forEach((creature, index) => {
          if(x == creature.creature.x && y == creature.creature.y) {       
            let hexColorString = "#" + parseInt(connectionsToString(creature.creature.brain!.connections).trim(), 36).toString(16).slice(-6); // convert to hexadecimal string
            let color = Phaser.Display.Color.HexStringToColor(hexColorString); // create color object
            localStorage.setItem(index.toString(), JSON.stringify({ string: connectionsToString(creature.creature.brain!.connections), color: hexColorString }));
            graphics.fillStyle(color.color, 1); // fill color, alpha
            graphics.fillCircle(3, 3, 3); // x, y, radius
            graphics.generateTexture('circle'+index, 6, 6);

            creature.sprite = new Phaser.GameObjects.Sprite(scene, x * 8, y * 8, 'circle'+index);
            players.add(creature.sprite);
          }
        })
      }
    }
  
    scene.add.existing(map);
    scene.add.existing(players);
  }
  

  private update() {
    creatures.forEach((creature) => {
      const creatureData = creature.creature;
      const nearestCreature = creatureData.nearestCreature(creatures.map(cre => cre.creature));
      const mapHeigth = 400;
      const mapWidth = 800;
      const inputs: { [key: string]: number } = {
        "Rnd": Math.random(),
        "Cld": 0.5,
        "Lx": creatureData.x / mapWidth,
        "Ly": creatureData.y / mapHeigth,
        "BD": 1 - (Math.min(creatureData.x, Math.abs(mapWidth - creatureData.x), creatureData.y, Math.abs(mapHeigth - creatureData.y)) / Math.sqrt(Math.pow(mapHeigth, 2) + Math.pow(mapWidth, 2))),
        "Lmx": creatureData.lastMoveX != 0 ? 1 : 0,
        "Lmy": creatureData.lastMoveY != 0 ? 1 : 0,
        "ND": 1 - (Phaser.Math.Distance.Between(creatureData.x, creatureData.y, nearestCreature.x, nearestCreature.y) / Math.sqrt(Math.pow(mapHeigth, 2) + Math.pow(mapWidth, 2))),
        "NDx": 1 - (Math.abs(creatureData.x - nearestCreature.x) / mapWidth),
        "NDy": 1 - (Math.abs(creatureData.y - nearestCreature.y) / mapHeigth),
        "Blr": 1 - (Math.min(creatureData.x, Math.abs(mapWidth - creatureData.x)) / mapWidth),
        "Bfd": 1 - (creatureData.y / mapHeigth),
      }

      const action = activateNeuralNetwork(creature.creature.brain!, inputs);
      const outputs: { [key: string]: Function } = {
        "MXl": () => {
          creature.creature.x = (creature.creature.x+1) % mapWidth;
        },
        "MXr": () => {
          creature.creature.x = (creature.creature.x-1) % 0;
        },
        "MYu": () => {
          creature.creature.y = (creature.creature.y-1) % 0;
        },
        "MYd": () => {
          creature.creature.y = (creature.creature.y+1) % mapHeigth;
        },
        "Mrv": () => {
          creature.creature.x -= creatureData.lastMoveX;
          creature.creature.y -= creatureData.lastMoveY;
        },
        "Mfd": () => {
          creature.creature.x += creatureData.lastMoveX;
          creature.creature.y += creatureData.lastMoveY;
        },
        "Mrn": () => {
          const directions = ["up", "down", "left", "right"];
          const randomDirection = directions[Math.floor(Math.random() * directions.length)];

          if (randomDirection === "up") {
            creature.creature.y -= 1;
          } else if (randomDirection === "down") {
            creature.creature.y += 1;
          } else if (randomDirection === "left") {
            creature.creature.x -= 1;
          } else if (randomDirection === "right") {
            creature.creature.x += 1;
          }
        }
      }

      const beforeActionX = creature.creature.x;
      const beforeActionY = creature.creature.y;

      outputs[action]();

      creature.creature.lastMoveX = creature.creature.x - beforeActionX;
      creature.creature.lastMoveY = creature.creature.y - beforeActionY;

      creature.sprite!.x = creature.creature.x * 8;
      creature.sprite!.y = creature.creature.y * 8;
    })
  }
}
