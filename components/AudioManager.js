export default class AudioManager {
  constructor(scene, musicKey, config = {}) {
    this.scene = scene;
    this.musicKey = musicKey;
    this.config = {
      defaultVolume: 0.5,
      loop: true,
      x: scene.scale.width - 220, // Posición por defecto (ajustada para horizontal)
      y: 30,
      panelWidth: 200,
      panelHeight: 50,
      primaryColor: 0x00cec9,
      secondaryColor: 0x2d3436,
      textColor: "#ffffff",
      ...config,
    };

    this.initMusic();
    this.createControls();
  }

  initMusic() {
    // Patrón Singleton para la música en la escena
    if (!this.scene.sound.get(this.musicKey)) {
      this.music = this.scene.sound.add(this.musicKey, {
        loop: this.config.loop,
        volume: this.config.defaultVolume,
      });
      this.music.play();
    } else {
      this.music = this.scene.sound.get(this.musicKey);
    }
  }

  createControls() {
    const {
      x,
      y,
      panelWidth,
      panelHeight,
      primaryColor,
      secondaryColor,
      textColor,
    } = this.config;

    // Contenedor principal
    this.container = this.scene.add
      .container(x, y)
      .setDepth(9999)
      .setScrollFactor(0);

    // 1. Panel de fondo (Estilo Glassmorphism)
    const bg = this.scene.add.graphics();
    bg.fillStyle(secondaryColor, 0.8);
    // Centrado verticalmente en el contenedor, horizontalmente desde 0 a panelWidth
    bg.fillRoundedRect(0, 0, panelWidth, panelHeight, 16);
    bg.lineStyle(2, primaryColor, 0.5);
    bg.strokeRoundedRect(0, 0, panelWidth, panelHeight, 16);
    this.container.add(bg);

    // 2. Botón de Mute (Izquierda)
    const muteBtnX = 30;
    const muteBtnY = panelHeight / 2;

    const muteCircle = this.scene.add.circle(
      muteBtnX,
      muteBtnY,
      18,
      primaryColor,
      0.2,
    );
    muteCircle.setStrokeStyle(2, primaryColor);

    this.muteIcon = this.scene.add
      .text(muteBtnX, muteBtnY, this.music.mute ? "🔇" : "🔊", {
        fontSize: "20px",
      })
      .setOrigin(0.5);

    const muteZone = this.scene.add
      .zone(muteBtnX, muteBtnY, 40, 40)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.toggleMute());

    // Efecto hover
    muteZone.on("pointerover", () => {
      this.scene.tweens.add({
        targets: muteCircle,
        scale: 1.1,
        alpha: 0.8,
        duration: 100,
      });
    });
    muteZone.on("pointerout", () => {
      this.scene.tweens.add({
        targets: muteCircle,
        scale: 1,
        alpha: 0.2,
        duration: 100,
      });
    });

    this.container.add([muteCircle, this.muteIcon, muteZone]);

    // 3. Barra de Volumen Horizontal (Derecha)
    const barMaxWidth = 120;
    const barHeight = 8;
    const barX = 60; // A la derecha del botón de mute
    const barY = panelHeight / 2;

    // Fondo de la barra
    const barBg = this.scene.add
      .rectangle(barX, barY, barMaxWidth, barHeight, 0xffffff, 0.1)
      .setOrigin(0, 0.5);

    // Relleno de la barra (El origen está a la izquierda)
    this.volumeFill = this.scene.add.rectangle(
      barX,
      barY,
      0,
      barHeight,
      primaryColor,
      1,
    );
    this.volumeFill.setOrigin(0, 0.5);

    // Actualizar ancho inicial según volumen actual
    this.updateVolumeVisuals();

    // Área interactiva para la barra (más alta para facilitar el toque)
    const sliderZone = this.scene.add
      .zone(barX + barMaxWidth / 2, barY, barMaxWidth + 20, 40)
      .setInteractive({ useHandCursor: true });

    const updateVolumeFromPointer = (pointer) => {
      // Calcular posición X global del inicio de la barra
      const startX = this.container.x + barX;

      let localX = pointer.position.x - startX;
      localX = Phaser.Math.Clamp(localX, 0, barMaxWidth);

      const newVolume = localX / barMaxWidth;
      this.setVolume(newVolume);
    };

    sliderZone.on("pointerdown", updateVolumeFromPointer);
    this.scene.input.on("pointermove", (pointer) => {
      if (
        pointer.isDown &&
        sliderZone.getBounds().contains(pointer.x, pointer.y)
      ) {
        updateVolumeFromPointer(pointer);
      }
    });

    this.container.add([barBg, this.volumeFill, sliderZone]);

    // 4. Etiqueta (Opcional, tal vez debajo o integrada en el diseño compacto)
    // Para horizontal, quizás sea mejor sin etiqueta de texto grande, o ponerla pequeña
    /*
    const label = this.scene.add.text(panelWidth - 25, panelHeight - 10, "VOL", {
      fontFamily: 'Arial',
      fontSize: '8px',
      color: primaryColor,
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.container.add(label);
    */

    // Animación de entrada (desde arriba)
    this.container.y -= 100;
    this.scene.tweens.add({
      targets: this.container,
      y: y,
      duration: 500,
      ease: "Back.out",
    });
  }

  toggleMute() {
    const isMuted = !this.music.mute;
    this.music.setMute(isMuted);
    this.muteIcon.setText(isMuted ? "🔇" : "🔊");

    // Feedback visual
    this.scene.tweens.add({
      targets: this.muteIcon,
      scale: { from: 1.5, to: 1 },
      duration: 200,
      ease: "Back.out",
    });

    if (!isMuted && this.music.volume === 0) {
      this.setVolume(0.5); // Restaurar volumen si estaba en 0
    }

    this.updateVolumeVisuals();
  }

  setVolume(value) {
    this.music.setVolume(value);

    if (value > 0 && this.music.mute) {
      this.music.setMute(false);
      this.muteIcon.setText("🔊");
    }

    if (value === 0 && !this.music.mute) {
      this.music.setMute(true);
      this.muteIcon.setText("🔇");
    }

    this.updateVolumeVisuals();
  }

  updateVolumeVisuals() {
    const barMaxWidth = 120;
    const currentVol = this.music.mute ? 0 : this.music.volume;

    this.scene.tweens.add({
      targets: this.volumeFill,
      width: currentVol * barMaxWidth,
      duration: 100,
      ease: "Linear",
    });

    this.volumeFill.setAlpha(this.music.mute ? 0.3 : 1);
  }
}
