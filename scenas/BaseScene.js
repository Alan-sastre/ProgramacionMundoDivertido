import AudioManager from "../components/AudioManager.js";

export default class BaseScene extends Phaser.Scene {
  constructor(key) {
    super(key);
    this.handGuide = null;
    this.audioManager = null;
  }

  preload() {
    this.load.image("roblogo", "roblogo.png");
    // Cargar la música una sola vez para todas las escenas
    if (!this.cache.audio.exists("bgMusic")) {
      this.load.audio("bgMusic", "musica (1).mp3");
    }
  }

  create() {
    // Iniciar AudioManager si no existe
    this.audioManager = new AudioManager(this, "bgMusic");

    // Inyectar el método showConfetti globalmente si no existe (algunas escenas lo llaman)
    if (!this.showConfetti) {
      this.showConfetti = () => {
        const { width, height } = this.scale;
        const colors = [
          0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff,
        ];
        for (let i = 0; i < 100; i++) {
          const x = Phaser.Math.Between(0, width);
          const y = Phaser.Math.Between(-height, 0);
          const color = Phaser.Utils.Array.GetRandom(colors);
          const size = Phaser.Math.Between(10, 20);
          const rect = this.add.rectangle(x, y, size, size, color);
          this.tweens.add({
            targets: rect,
            y: height + 50,
            x: x + Phaser.Math.Between(-100, 100),
            angle: 360,
            duration: Phaser.Math.Between(2000, 4000),
            ease: "Linear",
            onComplete: () => rect.destroy(),
          });
        }
      };
    }
  }

  createBackground() {
    const { width, height } = this.scale;

    // Fondo con degradado (Oscuro arriba, azul profundo abajo)
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x000b1a, 0x000b1a, 0x012456, 0x012456, 1);
    graphics.fillRect(0, 0, width, height);

    // Estrellas titilantes para dar profundidad
    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const star = this.add.circle(
        x,
        y,
        Phaser.Math.Between(1, 3),
        0xffffff,
        0.5,
      );
      this.tweens.add({
        targets: star,
        alpha: 0.1,
        duration: Phaser.Math.Between(1000, 3000),
        yoyo: true,
        repeat: -1,
      });
    }

    // Partículas animadas de fondo (Iconos de programación más brillantes)
    this.particles = [];
    const emojis = ["💻", "⚡", "⚙️", "👾", "⭐", "🚀", "🤖"];
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const particle = this.addEmojiText(
        x,
        y,
        Phaser.Utils.Array.GetRandom(emojis),
        {
          fontSize: Phaser.Math.Between(20, 40) + "px",
        },
      );
      particle.setAlpha(0.2);
      this.tweens.add({
        targets: particle,
        y: y - Phaser.Math.Between(50, 100),
        x: x + Phaser.Math.Between(-30, 30),
        angle: 360,
        alpha: 0,
        duration: Phaser.Math.Between(3000, 6000),
        repeat: -1,
        yoyo: false,
      });
      this.particles.push(particle);
    }
  }

  // Helper para crear texto con emojis sin que se recorten y con mejor soporte de fuentes
  addEmojiText(x, y, text, style = {}) {
    const emojiStyle = {
      fontSize: "32px",
      fontFamily:
        '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", Arial',
      color: "#000000",
      ...style,
      padding: { x: 10, y: 10 },
    };
    return this.add.text(x, y, text, emojiStyle);
  }

  showConfetti() {
    const { width, height } = this.scale;
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];

    for (let i = 0; i < 100; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(-height, 0);
      const color = Phaser.Utils.Array.GetRandom(colors);
      const size = Phaser.Math.Between(10, 20);

      const rect = this.add.rectangle(x, y, size, size, color);

      this.tweens.add({
        targets: rect,
        y: height + 50,
        x: x + Phaser.Math.Between(-100, 100),
        angle: 360,
        duration: Phaser.Math.Between(2000, 4000),
        ease: "Linear",
        onComplete: () => rect.destroy(),
      });
    }
  }

  createHandGuide() {
    // Si la mano guía ya existe y está activa, solo asegurar su profundidad
    if (this.handGuide && this.handGuide.active && this.handGuide.scene) {
      this.handGuide.setDepth(5000);
      return;
    }

    // Si la referencia existe pero el objeto fue destruido (tras reiniciar la escena), recrearlo
    this.handGuide = this.addEmojiText(0, 0, "👆", { fontSize: "64px" })
      .setDepth(5000)
      .setOrigin(0.5);
    this.handGuide.setVisible(false);
  }

  showGuideAt(x, y) {
    this.createHandGuide(); // Forzar recreación si es necesario tras reinicio

    // Detener cualquier animación previa
    this.tweens.killTweensOf(this.handGuide);

    // Bajar la posición de la mano considerablemente (offset de 80px) para que el dedo apunte al objeto desde abajo
    const displayY = y + 80;
    this.handGuide.setPosition(x, displayY);
    this.handGuide.setVisible(true).setDepth(5000).setAlpha(1);

    // Animación de rebote para la mano
    this.tweens.add({
      targets: this.handGuide,
      y: displayY - 20,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  hideGuide() {
    if (this.handGuide) {
      this.handGuide.setVisible(false);
      this.tweens.killTweensOf(this.handGuide);
    }
  }

  showDragGuide(x1, y1, x2, y2) {
    this.createHandGuide();

    // Aplicar offset de 80px para que la mano no tape el objeto de origen ni el de destino
    const startY = y1 + 80;
    const endY = y2 + 80;

    this.handGuide
      .setPosition(x1, startY)
      .setVisible(true)
      .setDepth(5000)
      .setAlpha(1);

    this.tweens.killTweensOf(this.handGuide);
    this.tweens.add({
      targets: this.handGuide,
      x: x2,
      y: endY,
      duration: 1500,
      repeat: -1,
      ease: "Cubic.easeInOut",
      onRepeat: () => {
        if (this.handGuide && this.handGuide.active) {
          this.handGuide.setPosition(x1, startY);
        }
      },
    });
  }
}
