import ArrowPuzzleScene from "./scenas/ArrowPuzzleScene.js";
import PuzzleSolarScene from "./scenas/PuzzleSolarScene.js";
import Puzzle2Scene from "./scenas/Puzzle2Scene.js";
import Puzzle3Scene from "./scenas/Puzzle3Scene.js";

const config = {
  type: Phaser.AUTO,
  width: 1000,
  height: 500,
  parent: "game-container",
  backgroundColor: "#001532",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [ArrowPuzzleScene, PuzzleSolarScene, Puzzle2Scene, Puzzle3Scene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    expandParent: true,
    orientation: Phaser.Scale.Orientation.LANDSCAPE,
  },
};

const game = new Phaser.Game(config);
