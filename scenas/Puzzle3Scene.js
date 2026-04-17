import BaseScene from "./BaseScene.js";

import AudioManager from "../components/AudioManager.js";

export default class Puzzle3Scene extends BaseScene {
  constructor() {
    super("Puzzle3Scene");
    this.fixed = false;
  }

  preload() {
    // Cargar la música si no existe
    if (!this.cache.audio.exists("bgMusic")) {
      this.load.audio("bgMusic", "musica (1).mp3");
    }
  }

  create() {
    const { width, height } = this.scale;
    
    // Iniciar AudioManager
    this.audioManager = new AudioManager(this, "bgMusic");

    this.createBackground();

    // Robot
    this.robot = this.addEmojiText(150, height / 2, "🤖", { fontSize: "80px" }).setOrigin(0.5);
    
    // Meta
    this.target = this.addEmojiText(width - 150, height / 2, "🏁", { fontSize: "80px" }).setOrigin(0.5);

    // Código con "BUG" pre-instalado
    // [ ⬆️ ] [ 👾 ] [ ⬆️ ]
    const panelX = width / 2;
    const panelY = height / 2;
    const types = ['FORWARD', 'BUG', 'FORWARD'];
    const emojis = ['⬆️', '👾', '⬆️'];
    const colors = [0x00e5ff, 0xff0000, 0x00e5ff];

    types.forEach((type, i) => {
        const x = panelX - 150 + (i * 150);
        const y = panelY + 100;
        
        const container = this.add.container(x, y);
        const bg = this.add.graphics();
        bg.fillStyle(colors[i], 1);
        bg.fillRoundedRect(-60, -40, 120, 80, 10);
        bg.lineStyle(3, 0xffffff, 1);
        bg.strokeRoundedRect(-60, -40, 120, 80, 10);
        
        const icon = this.addEmojiText(0, 0, emojis[i], { fontSize: "40px" }).setOrigin(0.5);
        container.add([bg, icon]);
        container.setData('type', type);
        
        if (type === 'BUG') {
            this.bugContainer = container;
            // Animación de bug
            this.tweens.add({ targets: icon, scale: 1.2, duration: 300, yoyo: true, repeat: -1 });
        }
    });

    // Bloque de reparación (El "Parche")
    const patchX = width / 2;
    const patchY = height - 100;
    this.patch = this.add.container(patchX, patchY);
    const pBg = this.add.graphics();
    pBg.fillStyle(0x00e5ff, 1);
    pBg.fillRoundedRect(-60, -40, 120, 80, 10);
    pBg.lineStyle(3, 0xffffff, 1);
    pBg.strokeRoundedRect(-60, -40, 120, 80, 10);
    const pIcon = this.addEmojiText(0, 0, "⬆️", { fontSize: "40px" }).setOrigin(0.5);
    this.patch.add([pBg, pIcon]);
    
    pBg.setInteractive(new Phaser.Geom.Rectangle(-60, -40, 120, 80), Phaser.Geom.Rectangle.Contains);
    this.input.setDraggable(pBg);

    pBg.on('drag', (pointer) => {
        this.hideGuide();
        this.patch.x = pointer.x;
        this.patch.y = pointer.y;
    });

    pBg.on('dragend', () => {
        const dist = Phaser.Math.Distance.Between(this.patch.x, this.patch.y, this.bugContainer.x, this.bugContainer.y);
        if (dist < 80) {
            this.fixBug();
        } else {
            this.tweens.add({ targets: this.patch, x: patchX, y: patchY, duration: 300 });
            this.updateGuide();
        }
    });

    // Crear la mano guía
    this.createHandGuide();
    this.updateGuide();
  }

  updateGuide() {
    if (!this.fixed) {
        this.showDragGuide(this.patch.x, this.patch.y, this.bugContainer.x, this.bugContainer.y);
    }
  }

  fixBug() {
    this.fixed = true;
    this.hideGuide();
    this.patch.setVisible(false);
    
    // Transformar el bug en un bloque bueno
    this.bugContainer.list[0].clear();
    this.bugContainer.list[0].fillStyle(0x00e5ff, 1);
    this.bugContainer.list[0].fillRoundedRect(-60, -40, 120, 80, 10);
    this.bugContainer.list[0].lineStyle(3, 0xffffff, 1);
    this.bugContainer.list[0].strokeRoundedRect(-60, -40, 120, 80, 10);
    this.bugContainer.list[1].setText("⬆️");
    this.tweens.killTweensOf(this.bugContainer.list[1]);
    this.bugContainer.list[1].setScale(1);

    this.cameras.main.flash(500, 0, 255, 255);
    
    this.time.delayedCall(500, () => this.executeProgram());
  }

  executeProgram() {
    this.tweens.add({
        targets: this.robot,
        x: this.target.x,
        duration: 2000,
        ease: 'Power2',
        onComplete: () => this.win()
    });
  }

  win() {
    this.showConfetti();
    this.time.delayedCall(3000, () => this.scene.start("PuzzleSolarScene"));
  }
}
