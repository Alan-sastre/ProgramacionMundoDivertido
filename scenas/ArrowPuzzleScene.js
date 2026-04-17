import AudioManager from "../components/AudioManager.js";

export default class ArrowPuzzleScene extends Phaser.Scene {
  constructor() {
    super("ArrowPuzzleScene");
    this.gridSize = 3;
    this.cellSize = 80; // Reducir tamaño de celda
    this.level = 1;
    this.startPos = { x: 0, y: 2 };
    this.robotPos = { x: 0, y: 2 };
    this.starPos = { x: 2, y: 0 };
    this.program = [];
    this.maxProgramSize = 4; // Cambiar a 4 slots como pidió el usuario
    this.isExecuting = false;
    this.slots = [];
    this.blocksInProgram = [];
    this.levels = [
      { robot: { x: 0, y: 2 }, star: { x: 2, y: 0 } }, // Nivel 1: Derecha, Derecha, Arriba, Arriba (4 pasos)
    ];
  }

  preload() {
    // Cargar la música si no existe en el caché
    if (!this.cache.audio.exists("bgMusic")) {
      this.load.audio("bgMusic", "musica (1).mp3");
    }
  }

  create() {
    const { width, height } = this.scale;
    
    // Iniciar AudioManager
    this.audioManager = new AudioManager(this, "bgMusic");

    this.add.rectangle(0, 0, width, height, 0x001532).setOrigin(0);

    // Fondo Animado (Estrellas fugaces o puntos)
    this.createAnimatedBackground();

    // Asegurar que el robot empiece en la posición de inicio del nivel
    this.robotPos = { ...this.startPos };
    this.program = [];
    this.blocksInProgram = [];
    this.isExecuting = false;
    this.slots = [];

    this.setupGrid();
    this.createRobot();
    this.createStar();
    this.createProgramUI();
    this.createControls();
    this.createDraggableArrows();
    this.setupAudio();
    this.setupParticles();

    // Listener de arrastre global (solo una vez)
    this.input.on("drag", (pointer, gameObject, dragX, dragY) => {
      if (this.isExecuting) return;
      this.hideGuide();
      const cont = gameObject.parentContainer;
      if (cont) {
        cont.x = pointer.x;
        cont.y = pointer.y;
        cont.setDepth(100);
      }
    });

    // Crear la mano guía de antemano para asegurar que exista
    this.handGuide = this.add
      .text(0, 0, "👆", { fontSize: "64px" })
      .setDepth(1000)
      .setOrigin(0.5)
      .setVisible(false);

    // Iniciar guía inmediatamente
    this.updateGuide();
    this.time.delayedCall(100, () => this.updateGuide());
  }

  createAnimatedBackground() {
    const { width, height } = this.scale;
    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const star = this.add.circle(
        x,
        y,
        Phaser.Math.FloatBetween(0.5, 2),
        0xffffff,
        0.3,
      );

      this.tweens.add({
        targets: star,
        alpha: 0.8,
        scale: 1.5,
        duration: Phaser.Math.Between(1000, 3000),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000),
      });
    }
  }

  setupGrid() {
    const { width, height } = this.scale;
    const totalGridWidth = this.gridSize * this.cellSize;
    const startX = width * 0.35 - totalGridWidth / 2; // Mover un poco más a la izquierda
    const startY = height * 0.4 - totalGridWidth / 2;
    this.gridStartX = startX;
    this.gridStartY = startY;

    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const color = (x + y) % 2 === 0 ? 0xdcfce7 : 0xffffff;
        const cell = this.add.graphics();
        cell.fillStyle(color, 1);
        cell.fillRoundedRect(
          startX + x * this.cellSize,
          startY + y * this.cellSize,
          this.cellSize - 4,
          this.cellSize - 4,
          8,
        );

        // Sombra leve
        cell.lineStyle(2, 0x000000, 0.1);
        cell.strokeRoundedRect(
          startX + x * this.cellSize + 2,
          startY + y * this.cellSize + 2,
          this.cellSize - 4,
          this.cellSize - 4,
          8,
        );
      }
    }
  }

  createRobot() {
    const x =
      this.gridStartX + this.robotPos.x * this.cellSize + this.cellSize / 2;
    const y =
      this.gridStartY + this.robotPos.y * this.cellSize + this.cellSize / 2;

    this.robot = this.add.container(x, y);
    const g = this.add.graphics();

    // Cuerpo
    g.fillStyle(0x94a3b8, 1);
    g.fillRoundedRect(-20, -20, 40, 35, 5);
    g.lineStyle(2, 0x475569, 1);
    g.strokeRoundedRect(-20, -20, 40, 35, 5);

    // Ojos
    g.fillStyle(0x22d3ee, 1);
    g.fillCircle(-8, -8, 5);
    g.fillCircle(8, -8, 5);

    // Antena
    g.lineStyle(2, 0x475569, 1);
    g.lineBetween(0, -20, 0, -30);
    g.fillStyle(0xef4444, 1);
    g.fillCircle(0, -32, 4);

    // Ruedas
    g.fillStyle(0x1e293b, 1);
    g.fillEllipse(-12, 15, 12, 8);
    g.fillEllipse(12, 15, 12, 8);

    this.robot.add(g);

    // Animación idle
    this.tweens.add({
      targets: this.robot,
      scale: 1.05,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Parpadeo ojos
    this.time.addEvent({
      delay: 3000,
      callback: () => {
        g.fillStyle(0x94a3b8, 1);
        g.fillCircle(-8, -8, 5);
        g.fillCircle(8, -8, 5);
        this.time.delayedCall(100, () => {
          g.fillStyle(0x22d3ee, 1);
          g.fillCircle(-8, -8, 5);
          g.fillCircle(8, -8, 5);
        });
      },
      loop: true,
    });
  }

  createStar() {
    const x =
      this.gridStartX + this.starPos.x * this.cellSize + this.cellSize / 2;
    const y =
      this.gridStartY + this.starPos.y * this.cellSize + this.cellSize / 2;

    this.star = this.add.graphics({ x, y });
    this.drawStar(this.star, 0, 0, 5, 25, 12, 0xfacc15);

    this.tweens.add({
      targets: this.star,
      angle: 360,
      duration: 4000,
      repeat: -1,
    });

    this.tweens.add({
      targets: this.star,
      scale: 1.2,
      alpha: 0.8,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  drawStar(graphics, cx, cy, spikes, outerRadius, innerRadius, color) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    graphics.fillStyle(color, 1);
    graphics.beginPath();
    graphics.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      graphics.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      graphics.lineTo(x, y);
      rot += step;
    }
    graphics.lineTo(cx, cy - outerRadius);
    graphics.closePath();
    graphics.fillPath();

    // Glow
    graphics.lineStyle(4, 0xffffff, 0.3);
    graphics.strokePath();
  }

  createProgramUI() {
    const { width, height } = this.scale;
    const panelY = height - 100;
    const panelWidth = 450; // Ajustar ancho para 4 slots
    const startX = width / 2 - panelWidth / 2 - 80; // Centrado

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.4);
    bg.fillRoundedRect(startX, panelY - 50, panelWidth, 100, 15);

    // Slots
    for (let i = 0; i < this.maxProgramSize; i++) {
      const x = startX + 60 + i * 110; // Ajustar espaciado para 4 slots
      const slot = this.add.graphics();
      slot.lineStyle(3, 0xffffff, 0.5);
      // Efecto punteado manual
      for (let a = 0; a < 360; a += 20) {
        const r = 35;
        const x1 = x + Math.cos(Phaser.Math.DegToRad(a)) * r;
        const y1 = panelY + Math.sin(Phaser.Math.DegToRad(a)) * r;
        const x2 = x + Math.cos(Phaser.Math.DegToRad(a + 10)) * r;
        const y2 = panelY + Math.sin(Phaser.Math.DegToRad(a + 10)) * r;
        slot.lineBetween(x1, y1, x2, y2);
      }
      this.slots.push({ x, y: panelY, filled: false });
    }
  }

  createDraggableArrows() {
    const { width } = this.scale;
    const arrowX = width - 100; // Mover más a la derecha (x: 900)
    const dirs = [
      { key: "UP", color: 0x3b82f6, angle: 0, x: arrowX - 100, y: 80 },
      { key: "DOWN", color: 0xef4444, angle: 180, x: arrowX - 100, y: 160 },
      { key: "LEFT", color: 0xf97316, angle: -90, x: arrowX - 100, y: 240 },
      { key: "RIGHT", color: 0x22c55e, angle: 90, x: arrowX - 100, y: 320 },
    ];

    dirs.forEach((dir) => {
      this.createArrow(dir);
    });
  }

  createArrow(data) {
    const container = this.add.container(data.x, data.y);
    const g = this.add.graphics();

    // Sombra
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(-33, -33, 70, 70, 10);

    // Fondo flecha
    g.fillStyle(data.color, 1);
    g.fillRoundedRect(-35, -35, 70, 70, 10);
    g.lineStyle(3, 0xffffff, 1);
    g.strokeRoundedRect(-35, -35, 70, 70, 10);

    // Triángulo flecha
    g.fillStyle(0xffffff, 1);
    g.beginPath();
    g.moveTo(0, -25);
    g.lineTo(20, 5);
    g.lineTo(-20, 5);
    g.closePath();
    g.fillPath();

    // Rectángulo flecha
    g.fillRect(-8, 5, 16, 15);

    container.add(g);
    container.angle = data.angle;
    container.setData("dir", data.key);
    container.setData("startX", data.x);
    container.setData("startY", data.y);

    g.setInteractive(
      new Phaser.Geom.Rectangle(-35, -35, 70, 70),
      Phaser.Geom.Rectangle.Contains,
    );
    this.input.setDraggable(g);

    g.on("pointerover", () => {
      if (!this.isExecuting) container.setScale(1.1);
    });
    g.on("pointerout", () => {
      if (!this.isExecuting) container.setScale(1);
    });

    g.on("dragend", (pointer) => {
      if (this.isExecuting) return;
      let placed = false;
      for (let slot of this.slots) {
        const dist = Phaser.Math.Distance.Between(
          container.x,
          container.y,
          slot.x,
          slot.y,
        );
        if (
          dist < 50 &&
          !slot.filled &&
          this.blocksInProgram.length < this.maxProgramSize
        ) {
          container.x = slot.x;
          container.y = slot.y;
          slot.filled = true;
          this.blocksInProgram.push(container);
          this.program.push(data.key);
          placed = true;
          this.playAudio("click");
          // Crear una nueva flecha en el origen para reponer
          this.createArrow(data);
          g.disableInteractive();
          this.updateGuide(); // Actualizar guía tras colocar
          break;
        }
      }
      if (!placed) {
        // Regresar suavemente al origen si falla la colocación
        this.tweens.add({
          targets: container,
          x: container.getData("startX"),
          y: container.getData("startY"),
          duration: 300,
          onComplete: () => {
            container.setDepth(1);
            this.updateGuide(); // Restaurar guía si falla
          },
        });
      }
    });
  }

  updateGuide() {
    if (this.isExecuting) {
      this.hideGuide();
      return;
    }

    const nextSlot = this.slots.find((s) => !s.filled);
    if (!nextSlot) {
      // Si el programa está lleno, guiar al botón PLAY
      const { width, height } = this.scale;
      this.showDragGuide(width - 100, height - 100, width - 100, height - 100);
      return;
    }

    // Calcular posición virtual basada en el programa actual
    let virtualX = this.startPos.x;
    let virtualY = this.startPos.y;
    for (let dir of this.program) {
      if (dir === "UP") virtualY--;
      else if (dir === "DOWN") virtualY++;
      else if (dir === "LEFT") virtualX--;
      else if (dir === "RIGHT") virtualX++;
    }

    // Determinar dirección necesaria
    let targetDir = "RIGHT";
    if (virtualY > this.starPos.y) targetDir = "UP";
    else if (virtualX < this.starPos.x) targetDir = "RIGHT";
    else if (virtualY < this.starPos.y) targetDir = "DOWN";
    else if (virtualX > this.starPos.x) targetDir = "LEFT";

    // Buscar una flecha disponible de ese tipo (que no esté en el panel de programa)
    const sourceArrow = this.children.list.find(
      (child) =>
        child.type === "Container" &&
        child.getData("dir") === targetDir &&
        child.y <= 320, // Las flechas fuente están en y: 80, 160, 240, 320
    );

    if (sourceArrow) {
      this.showDragGuide(sourceArrow.x, sourceArrow.y, nextSlot.x, nextSlot.y);
    }
  }

  showDragGuide(x1, y1, x2, y2) {
    if (!this.handGuide) {
      this.handGuide = this.add
        .text(0, 0, "👆", { fontSize: "64px" })
        .setDepth(1000)
        .setOrigin(0.5);
    }

    this.handGuide.setVisible(true);
    this.tweens.killTweensOf(this.handGuide);
    this.handGuide.setPosition(x1, y1);

    if (x1 === x2 && y1 === y2) {
      // Animación de rebote para botones estáticos
      this.tweens.add({
        targets: this.handGuide,
        y: y1 - 20,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    } else {
      // Animación de trayectoria para arrastre
      this.tweens.add({
        targets: this.handGuide,
        x: x2,
        y: y2,
        duration: 2000,
        repeat: -1,
        ease: "Cubic.easeInOut",
        onRepeat: () => {
          this.handGuide.setPosition(x1, y1);
        },
      });
    }
  }

  hideGuide() {
    if (this.handGuide) {
      this.handGuide.setVisible(false);
      this.tweens.killTweensOf(this.handGuide);
    }
  }

  createControls() {
    const { width, height } = this.scale;

    // Botón PLAY
    const playBtn = this.add.container(width - 100, height - 100);
    const g = this.add.graphics();
    g.fillStyle(0x22c55e, 1);
    g.fillCircle(0, 0, 45);
    g.lineStyle(4, 0xffffff, 1);
    g.strokeCircle(0, 0, 45);

    // Triángulo Play
    g.fillStyle(0xffffff, 1);
    g.beginPath();
    g.moveTo(-10, -15);
    g.lineTo(20, 0);
    g.lineTo(-10, 15);
    g.closePath();
    g.fillPath();

    playBtn.add(g);
    g.setInteractive(
      new Phaser.Geom.Circle(0, 0, 45),
      Phaser.Geom.Circle.Contains,
    );

    this.tweens.add({
      targets: playBtn,
      scale: 1.1,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    g.on("pointerdown", () => this.executeProgram());

    // Botón RESET
    const resetBtn = this.add.container(width - 100, height - 200);
    const rg = this.add.graphics();

    // Sombra del botón
    rg.fillStyle(0x000000, 0.3);
    rg.fillCircle(3, 3, 35);

    // Cuerpo del botón
    rg.fillStyle(0xef4444, 1);
    rg.fillCircle(0, 0, 35);
    rg.lineStyle(3, 0xffffff, 1);
    rg.strokeCircle(0, 0, 35);

    // Emoji de reiniciar (más claro que el dibujo manual)
    const resetIcon = this.add
      .text(0, 0, "🔄", { fontSize: "32px" })
      .setOrigin(0.5);

    resetBtn.add([rg, resetIcon]);
    rg.setInteractive(
      new Phaser.Geom.Circle(0, 0, 35),
      Phaser.Geom.Circle.Contains,
    );

    // Animación de hover para el botón reset
    rg.on("pointerover", () => resetBtn.setScale(1.1));
    rg.on("pointerout", () => resetBtn.setScale(1));
    rg.on("pointerdown", () => {
      resetBtn.setScale(0.9);
      this.resetLevel();
    });
    rg.on("pointerup", () => resetBtn.setScale(1.1));
  }

  async executeProgram() {
    if (this.isExecuting || this.program.length === 0) return;
    this.isExecuting = true;

    for (let dir of this.program) {
      let nextX = this.robotPos.x;
      let nextY = this.robotPos.y;

      if (dir === "UP") nextY--;
      else if (dir === "DOWN") nextY++;
      else if (dir === "LEFT") nextX--;
      else if (dir === "RIGHT") nextX++;

      if (
        nextX < 0 ||
        nextX >= this.gridSize ||
        nextY < 0 ||
        nextY >= this.gridSize
      ) {
        this.handleError();
        return;
      }

      this.robotPos.x = nextX;
      this.robotPos.y = nextY;

      await this.moveRobotTo(nextX, nextY);
      this.playAudio("beep");

      if (
        this.robotPos.x === this.starPos.x &&
        this.robotPos.y === this.starPos.y
      ) {
        this.handleWin();
        return;
      }
    }

    // Si terminó el programa y no llegó
    if (
      this.robotPos.x !== this.starPos.x ||
      this.robotPos.y !== this.starPos.y
    ) {
      this.handleError();
    }
  }

  moveRobotTo(gridX, gridY) {
    return new Promise((resolve) => {
      const x = this.gridStartX + gridX * this.cellSize + this.cellSize / 2;
      const y = this.gridStartY + gridY * this.cellSize + this.cellSize / 2;
      this.tweens.add({
        targets: this.robot,
        x,
        y,
        duration: 300,
        onComplete: resolve,
      });
    });
  }

  handleError() {
    this.playAudio("error");
    this.tweens.add({
      targets: this.robot,
      x: this.robot.x + 10,
      duration: 50,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        this.resetRobot();
      },
    });
  }

  handleWin() {
    this.playAudio("win");
    this.celebrate();
    this.time.delayedCall(2000, () => {
      // Al completar el único nivel de flechas, pasamos a la siguiente escena
      this.scene.start("PuzzleSolarScene");
    });
  }

  resetRobot() {
    this.robotPos = { ...this.startPos };
    const x =
      this.gridStartX + this.robotPos.x * this.cellSize + this.cellSize / 2;
    const y =
      this.gridStartY + this.robotPos.y * this.cellSize + this.cellSize / 2;
    this.tweens.add({
      targets: this.robot,
      x,
      y,
      duration: 500,
      onComplete: () => {
        this.isExecuting = false;
        this.updateGuide(); // Asegurar que la guía vuelva tras el reset
      },
    });
  }

  resetLevel() {
    this.blocksInProgram.forEach((b) => b.destroy());
    this.blocksInProgram = [];
    this.program = [];
    this.slots.forEach((s) => (s.filled = false));
    this.resetRobot();
    this.updateGuide(); // Reiniciar guía
  }

  setupAudio() {
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  playAudio(type) {
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    const now = this.audioCtx.currentTime;

    if (type === "click") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === "beep") {
      osc.type = "square";
      osc.frequency.setValueAtTime(400, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === "win") {
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, i) => {
        const o = this.audioCtx.createOscillator();
        const g = this.audioCtx.createGain();
        o.connect(g);
        g.connect(this.audioCtx.destination);
        o.frequency.setValueAtTime(freq, now + i * 0.15);
        g.gain.setValueAtTime(0.1, now + i * 0.15);
        g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.3);
        o.start(now + i * 0.15);
        o.stop(now + i * 0.15 + 0.3);
      });
    } else if (type === "error") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.linearRampToValueAtTime(50, now + 0.3);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  }

  setupParticles() {
    // Crear una textura para el confeti (un pequeño rectángulo)
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 8, 8);
    g.generateTexture("confetti", 8, 8);

    this.celebrationEmitter = this.add.particles(0, 0, "confetti", {
      emitting: false,
      speed: { min: 150, max: 400 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      lifespan: 1500,
      gravityY: 300,
      rotate: { min: 0, max: 360 },
      quantity: 100,
    });
  }

  celebrate() {
    const { width, height } = this.scale;
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];

    for (let i = 0; i < 8; i++) {
      this.time.delayedCall(i * 200, () => {
        const x = Phaser.Math.Between(100, width - 100);
        const y = Phaser.Math.Between(100, height - 100);

        this.celebrationEmitter.setParticleTint(
          Phaser.Utils.Array.GetRandom(colors),
        );
        this.celebrationEmitter.explode(40, x, y);
      });
    }
  }
}
