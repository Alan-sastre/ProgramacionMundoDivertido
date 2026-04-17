import BaseScene from "./BaseScene.js";
import AudioManager from "../components/AudioManager.js";

export default class PuzzleSolarScene extends BaseScene {
  constructor() {
    super("PuzzleSolarScene");
    this.level = 1;
    this.phase = 1; // 1: Normal, 2: Discovery/Loop
    this.gridSize = { x: 8, y: 6 };
    this.cellSize = 85; // Mantenemos separación pero moviendo la cuadrícula arriba para no solapar

    // Configuración de niveles
    this.levels = [
      {
        id: 1,
        start: { x: 1, y: 3 },
        path: ["RIGHT", "RIGHT", "RIGHT"], // Requiere 3 a la derecha
        target: { x: 4, y: 3 },
        description: "Repetir Derecha x3",
      },
      {
        id: 2,
        start: { x: 1, y: 4 },
        path: ["RIGHT", "RIGHT", "RIGHT", "RIGHT", "UP", "UP"],
        target: { x: 5, y: 2 },
        description: "Repetir Derecha x4 luego Arriba x2",
      },
    ];

    this.program = [];
    this.slots = [];
    this.blocksInProgram = [];
    this.isExecuting = false;
    this.loopCount = 1;
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

    // Fondo de estanque realista (Degradado de agua profunda)
    const waterBg = this.add.graphics();
    waterBg.fillGradientStyle(0x0ea5e9, 0x0ea5e9, 0x0369a1, 0x0369a1, 1);
    waterBg.fillRect(0, 0, width, height);

    // Ondas de agua animadas
    this.createWaterRipples();
    this.createAnimatedBackground();
    this.createBackgroundDetails(); // Nuevos detalles decorativos

    this.initLevel();
    this.setupAudio();
    this.setupParticles();

    // Asegurarse de que solo haya una mano guía
    this.createHandGuide();

    this.updateGuide();
    this.time.delayedCall(500, () => this.updateGuide());
  }

  createBackgroundDetails() {
    const { width, height } = this.scale;

    // Añadir algunas flores de loto flotando aleatoriamente
    for (let i = 0; i < 5; i++) {
      const x = Phaser.Math.Between(50, width - 50);
      const y = Phaser.Math.Between(50, height - 200);
      this.createDecorLily(x, y);
    }

    // Añadir juncos a los lados
    const reeds = this.add.graphics();
    reeds.lineStyle(4, 0x064e3b, 0.8);
    for (let i = 0; i < 10; i++) {
      const x = i * 20 + 20;
      const h = Phaser.Math.Between(50, 100);
      reeds.lineBetween(x, height, x + 10, height - h);
      reeds.lineBetween(width - x, height, width - x - 10, height - h);
    }
  }

  createDecorLily(x, y) {
    const lily = this.add.container(x, y);
    const g = this.add.graphics();

    // Hoja más orgánica
    g.fillStyle(0x166534, 0.8);
    g.beginPath();
    for (let a = 0; a < 360; a += 10) {
      const rad = Phaser.Math.DegToRad(a);
      const r = 30 + Math.sin(a * 5) * 2;
      const px = Math.cos(rad) * r;
      const py = Math.sin(rad) * r * 0.7;
      if (a === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fillPath();

    // Pequeña flor sobre la hoja decorativa
    const petalColor = 0xffffff;
    for (let i = 0; i < 5; i++) {
      const angle = i * 72 * (Math.PI / 180);
      g.fillStyle(petalColor, 0.9);
      g.fillEllipse(Math.cos(angle) * 8, Math.sin(angle) * 8, 12, 6);
    }
    g.fillStyle(0xfef08a, 1);
    g.fillCircle(0, 0, 5);

    lily.add(g);
    lily.setScale(Phaser.Math.FloatBetween(0.5, 0.8));

    // Animación suave de balanceo
    this.tweens.add({
      targets: lily,
      x: x + 5,
      y: y + 5,
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  createWaterRipples() {
    const { width, height } = this.scale;
    for (let i = 0; i < 15; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const ripple = this.add.graphics();
      ripple.lineStyle(2, 0xffffff, 0.2);
      ripple.strokeEllipse(x, y, 40, 20);
      ripple.setAlpha(0);

      this.tweens.add({
        targets: ripple,
        alpha: 0.5,
        scale: 2,
        duration: Phaser.Math.Between(2000, 4000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 3000),
        ease: "Sine.easeOut",
        onRepeat: () => {
          ripple.setPosition(
            Phaser.Math.Between(0, width),
            Phaser.Math.Between(0, height),
          );
          ripple.setScale(1);
          ripple.setAlpha(0);
        },
      });
    }
  }

  initLevel() {
    const lvlData = this.levels[this.level - 1];
    this.startPos = { ...lvlData.start };
    this.frogPos = { ...lvlData.start };
    this.targetPos = { ...lvlData.target };
    this.path = [...lvlData.path];

    this.program = [];
    this.slots = [];
    this.blocksInProgram = [];
    this.isExecuting = false;
    this.loopArrow = null; // Resetear la flecha del bucle
    this.loopCount = 1; // Resetear el contador del bucle

    this.drawLillypads();
    this.createFrog();
    this.createTargetFlower();
    this.createUI();
    this.createDraggableArrows();

    if (this.phase === 2) {
      this.createLoopBox();
    }

    this.updateGuide();
  }

  createAnimatedBackground() {
    const { width, height } = this.scale;
    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const sparkle = this.add.circle(
        x,
        y,
        Phaser.Math.FloatBetween(1, 3),
        0xffffff,
        0.4,
      );
      this.tweens.add({
        targets: sparkle,
        alpha: 0.8,
        scale: 1.5,
        duration: Phaser.Math.Between(1500, 3000),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000),
      });
    }
  }

  drawLillypads() {
    const { width, height } = this.scale;
    this.gridStartX = width * 0.1; // Un poco más a la izquierda
    this.gridStartY = height * 0.02; // Casi al borde superior para dar espacio a la UI

    // Solo dibujar lilypads en el camino y celdas relevantes
    const lvlData = this.levels[this.level - 1];
    let current = { ...lvlData.start };
    this.drawLilyAt(current.x, current.y);

    for (let dir of lvlData.path) {
      if (dir === "RIGHT") current.x++;
      else if (dir === "LEFT") current.x--;
      else if (dir === "UP") current.y--;
      else if (dir === "DOWN") current.y++;
      this.drawLilyAt(current.x, current.y);
    }
  }

  drawLilyAt(gx, gy) {
    const x = this.gridStartX + gx * this.cellSize;
    const y = this.gridStartY + gy * this.cellSize;

    // Sombra del nenúfar más suave y desplazada
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.15);
    shadow.fillEllipse(x + 8, y + 8, 75, 55);

    const g = this.add.graphics();

    // Degradado de color verde para la hoja
    const colorLight = 0x22c55e;
    const colorDark = 0x14532d;

    // Dibujar la hoja con una forma más orgánica y el corte característico
    g.fillStyle(colorDark, 1);
    g.beginPath();
    const steps = 60;
    const cutAngle = 45; // Ángulo del corte
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * 360;
      if (angle > cutAngle && angle < 360 - cutAngle) {
        const rad = Phaser.Math.DegToRad(angle);
        const r = 35 + Math.sin(angle * 4) * 1.5; // Irregularidad orgánica
        const px = Math.cos(rad) * r;
        const py = Math.sin(rad) * r * 0.75;
        if (i === 0 || angle <= cutAngle + 360 / steps) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
    }
    g.lineTo(0, 0); // Ir al centro para cerrar el corte
    g.closePath();
    g.fillPath();

    // Capa superior con color más claro para volumen
    g.fillStyle(colorLight, 1);
    g.beginPath();
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * 360;
      if (angle > cutAngle + 2 && angle < 360 - cutAngle - 2) {
        const rad = Phaser.Math.DegToRad(angle);
        const r = 32 + Math.sin(angle * 4) * 1;
        const px = Math.cos(rad) * r;
        const py = Math.sin(rad) * r * 0.7;
        if (i === 0 || angle <= cutAngle + 2 + 360 / steps) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
    }
    g.lineTo(0, 0);
    g.closePath();
    g.fillPath();

    // Nervaduras más sutiles y detalladas
    g.lineStyle(1, 0x064e3b, 0.3);
    for (let a = cutAngle + 20; a < 360 - cutAngle - 20; a += 30) {
      const rad = Phaser.Math.DegToRad(a);
      g.lineBetween(0, 0, Math.cos(rad) * 30, Math.sin(rad) * 22);
    }

    // Borde iluminado
    g.lineStyle(2, 0x4ade80, 0.6);
    g.strokeEllipse(0, 0, 68, 50);

    const container = this.add.container(x, y, [g]);

    // Pequeña animación de flotación para cada nenúfar
    this.tweens.add({
      targets: container,
      y: y + 3,
      duration: 2000 + Math.random() * 1000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  createFrog() {
    const x = this.gridStartX + this.frogPos.x * this.cellSize;
    const y = this.gridStartY + this.frogPos.y * this.cellSize;

    this.frog = this.add.container(x, y);
    const g = this.add.graphics();

    // Sombra proyectada
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.3);
    shadow.fillEllipse(0, 15, 30, 15);
    this.frog.add(shadow);

    // Patas traseras (más musculosas)
    g.fillStyle(0x15803d, 1);
    g.fillEllipse(-18, 8, 15, 12);
    g.fillEllipse(18, 8, 15, 12);

    // Cuerpo (forma de pera)
    g.fillStyle(0x22c55e, 1);
    g.fillEllipse(0, 0, 40, 35);

    // Panza más clara
    g.fillStyle(0x86efac, 1);
    g.fillEllipse(0, 5, 25, 20);

    // Ojos saltones realistas
    g.fillStyle(0xffffff, 1);
    g.fillCircle(-14, -18, 10);
    g.fillCircle(14, -18, 10);

    // Iris amarillo
    g.fillStyle(0xfacc15, 1);
    g.fillCircle(-14, -18, 7);
    g.fillCircle(14, -18, 7);

    // Pupila
    g.fillStyle(0x000000, 1);
    g.fillCircle(-14, -18, 4);
    g.fillCircle(14, -18, 4);

    // Brillo en el ojo
    g.fillStyle(0xffffff, 1);
    g.fillCircle(-16, -20, 2);
    g.fillCircle(12, -20, 2);

    this.frog.add(g);
    this.frogBody = g; // Referencia para squash/stretch

    // Animación Idle mejorada (respiración)
    this.tweens.add({
      targets: g,
      scaleX: 1.05,
      scaleY: 0.95,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  createTargetFlower() {
    const x = this.gridStartX + this.targetPos.x * this.cellSize;
    const y = this.gridStartY + this.targetPos.y * this.cellSize;

    this.flower = this.add.container(x, y);
    const g = this.add.graphics();

    // Pétalos (Círculos rosados)
    const petalColor = 0xf472b6;
    for (let i = 0; i < 6; i++) {
      const angle = i * 60 * (Math.PI / 180);
      const px = Math.cos(angle) * 15;
      const py = Math.sin(angle) * 15;
      g.fillStyle(petalColor, 1);
      g.fillCircle(px, py, 12);
    }

    // Centro amarillo
    g.fillStyle(0xfef08a, 1);
    g.fillCircle(0, 0, 10);

    this.flower.add(g);
    this.flower.setScale(0.8);

    this.tweens.add({
      targets: this.flower,
      scale: 1.1,
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });
  }

  createUI() {
    const { width, height } = this.scale;
    const panelY = height - 100;

    // Panel de programa (Comparador visual)
    const panelWidth = this.phase === 1 ? 400 : 800;
    const startX = width / 2 - panelWidth / 2;

    const bg = this.add.graphics();

    if (this.phase === 1) {
      // Fondo rojo suave para "Modo Largo"
      bg.fillStyle(0xfee2e2, 0.5);
      bg.fillRoundedRect(startX, panelY - 50, panelWidth, 100, 15);

      // Slots normales
      const slotCount = 3; // Nivel 1 siempre requiere 3 movimientos
      this.maxProgramSize = slotCount;
      const slotStartX = startX + 50;
      for (let i = 0; i < slotCount; i++) {
        const x = slotStartX + i * 80;
        const slot = this.add.graphics();
        slot.lineStyle(3, 0xffffff, 0.8);
        slot.strokeRoundedRect(x - 30, panelY - 30, 60, 60, 8);
        this.slots.push({ x, y: panelY, filled: false });
      }
    } else {
      // Definir el slot del bucle basado en la posición de la loopBox
      // Movido un poco a la izquierda de la pantalla para no tapar el número
      this.loopSlot = { x: width / 2 + 185, y: height - 105, filled: false };
    }

    // Botón PLAY
    this.createPlayButton(width - 80, height - 80);

    // Botón RESET (Emoji ↺)
    this.createResetButton(width - 80, height - 180);
  }

  createPlayButton(x, y) {
    const btn = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0x22c55e, 1);
    g.fillCircle(0, 0, 40);
    g.lineStyle(3, 0xffffff, 1);
    g.strokeCircle(0, 0, 40);

    g.fillStyle(0xffffff, 1);
    g.beginPath();
    g.moveTo(-10, -15);
    g.lineTo(20, 0);
    g.lineTo(-10, 15);
    g.closePath();
    g.fillPath();

    btn.add(g);
    g.setInteractive(
      new Phaser.Geom.Circle(0, 0, 40),
      Phaser.Geom.Circle.Contains,
    );
    g.on("pointerdown", () => this.executeProgram());

    this.tweens.add({
      targets: btn,
      scale: 1.1,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });
  }

  createResetButton(x, y) {
    const btn = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0xef4444, 1);
    g.fillCircle(0, 0, 30);
    g.lineStyle(2, 0xffffff, 1);
    g.strokeCircle(0, 0, 30);

    const icon = this.add
      .text(0, 0, "↺", { fontSize: "32px", color: "#ffffff" })
      .setOrigin(0.5);
    btn.add([g, icon]);

    g.setInteractive(
      new Phaser.Geom.Circle(0, 0, 30),
      Phaser.Geom.Circle.Contains,
    );
    g.on("pointerdown", () => this.scene.restart());

    g.on("pointerover", () => btn.setScale(1.1));
    g.on("pointerout", () => btn.setScale(1));
  }

  createDraggableArrows() {
    const { width } = this.scale;
    const arrowX = width - 200;
    const dirs = [
      { key: "UP", color: 0x3b82f6, angle: 0, x: arrowX, y: 100 },
      { key: "RIGHT", color: 0x22c55e, angle: 90, x: arrowX, y: 200 },
    ];

    dirs.forEach((data) => {
      const container = this.add.container(data.x, data.y);
      const g = this.add.graphics();
      g.fillStyle(data.color, 1);
      g.fillRoundedRect(-25, -25, 50, 50, 8);
      g.lineStyle(2, 0xffffff, 1);
      g.strokeRoundedRect(-25, -25, 50, 50, 8);

      // Flecha blanca
      g.fillStyle(0xffffff, 1);
      g.beginPath();
      g.moveTo(0, -15);
      g.lineTo(12, 5);
      g.lineTo(-12, 5);
      g.closePath();
      g.fillPath();
      g.fillRect(-5, 5, 10, 10);

      container.add(g);
      container.angle = data.angle;
      container.setData("dir", data.key);
      container.setData("startX", data.x);
      container.setData("startY", data.y);

      g.setInteractive(
        new Phaser.Geom.Rectangle(-25, -25, 50, 50),
        Phaser.Geom.Rectangle.Contains,
      );
      this.input.setDraggable(g);
    });

    this.input.on("drag", (pointer, gameObject, dragX, dragY) => {
      if (this.isExecuting) return;
      const cont = gameObject.parentContainer;
      cont.x = pointer.x;
      cont.y = pointer.y;
      cont.setDepth(100);
      this.hideGuide();
    });

    this.input.on("dragend", (pointer, gameObject) => {
      const cont = gameObject.parentContainer;
      const dir = cont.getData("dir");
      let placed = false;

      if (this.phase === 1) {
        // Colocar en slots normales
        for (let slot of this.slots) {
          const dist = Phaser.Math.Distance.Between(
            cont.x,
            cont.y,
            slot.x,
            slot.y,
          );
          if (dist < 40 && !slot.filled) {
            cont.x = slot.x;
            cont.y = slot.y;
            slot.filled = true;
            this.program.push(dir);
            this.blocksInProgram.push(cont);
            placed = true;
            this.playAudio("tick");
            break;
          }
        }
      } else if (this.phase === 2) {
        // Colocar en la caja de bucle
        const dist = Phaser.Math.Distance.Between(
          cont.x,
          cont.y,
          this.loopSlot.x,
          this.loopSlot.y,
        );
        if (dist < 60) {
          cont.x = this.loopSlot.x;
          cont.y = this.loopSlot.y;
          this.loopArrow = dir;
          placed = true;
          this.playAudio("magic");
          this.updateLoopDisplay();
        }
      }

      if (!placed) {
        this.tweens.add({
          targets: cont,
          x: cont.getData("startX"),
          y: cont.getData("startY"),
          duration: 300,
        });
      } else {
        // Reponer flecha si se usó
        this.createSingleArrow(
          cont.getData("dir"),
          cont.getData("startX"),
          cont.getData("startY"),
          cont.angle,
        );
        gameObject.disableInteractive();
        this.updateGuide();
      }
    });
  }

  createSingleArrow(dir, x, y, angle) {
    const data = {
      key: dir,
      x,
      y,
      angle,
      color: dir === "UP" ? 0x3b82f6 : 0x22c55e,
    };
    const container = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(data.color, 1);
    g.fillRoundedRect(-25, -25, 50, 50, 8);
    g.lineStyle(2, 0xffffff, 1);
    g.strokeRoundedRect(-25, -25, 50, 50, 8);

    g.fillStyle(0xffffff, 1);
    g.beginPath();
    g.moveTo(0, -15);
    g.lineTo(12, 5);
    g.lineTo(-12, 5);
    g.closePath();
    g.fillPath();
    g.fillRect(-5, 5, 10, 10);

    container.add(g);
    container.angle = angle;
    container.setData("dir", dir);
    container.setData("startX", x);
    container.setData("startY", y);
    g.setInteractive(
      new Phaser.Geom.Rectangle(-25, -25, 50, 50),
      Phaser.Geom.Rectangle.Contains,
    );
    this.input.setDraggable(g);
  }

  createLoopBox() {
    const { width, height } = this.scale;
    const x = width / 2 + 220;
    const y = height - 100;

    this.loopBox = this.add.container(x, y);
    const g = this.add.graphics();

    // Diseño de "Máquina de Repetición" (Estilo Gameboy/Consola)
    g.fillStyle(0x4c1d95, 1); // Púrpura oscuro
    g.fillRoundedRect(-100, -60, 200, 110, 15);
    g.lineStyle(4, 0x8b5cf6, 1);
    g.strokeRoundedRect(-100, -60, 200, 110, 15);

    // Pantalla de cristal líquido (Ahora más grande y a la derecha)
    g.fillStyle(0x064e3b, 1);
    g.fillRoundedRect(10, -40, 75, 75, 10);
    g.lineStyle(2, 0x10b981, 0.5);
    g.strokeRoundedRect(10, -40, 75, 75, 10);

    // Marco para la flecha (Slot visible)
    g.lineStyle(3, 0x8b5cf6, 0.8);
    g.strokeRoundedRect(-75, -40, 75, 75, 10);

    // Botones de control (D-Pad style)
    g.fillStyle(0x1e1b4b, 1);
    g.fillCircle(-60, 20, 20); // Movido para no molestar al slot

    this.loopBox.add(g);

    // Icono 🔁 más descriptivo
    const loopIcon = this.add
      .text(-60, 20, "🔁", { fontSize: "20px" })
      .setOrigin(0.5);
    this.loopBox.add(loopIcon);

    // Número en la pantalla (Alineado con el fondo verde)
    this.loopNumText = this.add
      .text(47, -3, "3", {
        fontSize: "45px",
        color: "#4ade80",
        fontFamily: "monospace",
        fontWeight: "bold",
      })
      .setOrigin(0.5);
    this.loopBox.add(this.loopNumText);

    // Botones + y - con emojis para máxima claridad
    const createBtn = (bx, by, emoji, color) => {
      const c = this.add.container(bx, by);
      const bg = this.add.graphics();
      bg.fillStyle(color, 1);
      bg.fillCircle(0, 0, 22);
      bg.lineStyle(2, 0xffffff, 1);
      bg.strokeCircle(0, 0, 22);
      const t = this.add.text(0, 0, emoji, { fontSize: "20px" }).setOrigin(0.5);
      c.add([bg, t]);
      bg.setInteractive(
        new Phaser.Geom.Circle(0, 0, 22),
        Phaser.Geom.Circle.Contains,
      );

      // Animación de escala
      bg.on("pointerover", () => c.setScale(1.1));
      bg.on("pointerout", () => c.setScale(1));
      bg.on("pointerdown", () => c.setScale(0.9));
      bg.on("pointerup", () => c.setScale(1.1));

      return { container: c, graphics: bg };
    };

    const plus = createBtn(95, -35, "➕", 0x16a34a);
    const minus = createBtn(95, 25, "➖", 0xdc2626);

    plus.graphics.on("pointerdown", () => {
      if (this.loopCount < 6) {
        this.loopCount++;
        this.updateLoopDisplay();
        this.playAudio("tick");
        this.updateGuide(); // Actualizar la guía inmediatamente
      }
    });

    minus.graphics.on("pointerdown", () => {
      if (this.loopCount > 1) {
        this.loopCount--;
        this.updateLoopDisplay();
        this.playAudio("tick");
        this.updateGuide(); // Actualizar la guía inmediatamente
      }
    });

    this.loopBox.add([plus.container, minus.container]);

    // Animación de entrada
    this.loopBox.setAlpha(0);
    this.loopBox.y += 50;
    this.tweens.add({
      targets: this.loopBox,
      alpha: 1,
      y: y,
      duration: 600,
      ease: "Back.easeOut",
    });
  }

  updateLoopDisplay() {
    if (this.loopNumText) {
      this.loopNumText.setText("x" + this.loopCount);
    }
  }

  async executeProgram() {
    if (this.isExecuting) return;

    let actions = [];
    if (this.phase === 1) {
      actions = [...this.program];
    } else {
      if (!this.loopArrow) return;
      for (let i = 0; i < this.loopCount; i++) actions.push(this.loopArrow);
    }

    if (actions.length === 0) return;
    this.isExecuting = true;

    for (let dir of actions) {
      let nextX = this.frogPos.x;
      let nextY = this.frogPos.y;

      if (dir === "UP") nextY--;
      else if (dir === "DOWN") nextY++;
      else if (dir === "LEFT") nextX--;
      else if (dir === "RIGHT") nextX++;

      // Verificar si hay lilypad en el destino
      // (Para simplificar, asumimos que si llega al destino exacto gana)
      this.frogPos.x = nextX;
      this.frogPos.y = nextY;

      await this.jumpTo(nextX, nextY);
      this.playAudio("bubble");
    }

    if (
      this.frogPos.x === this.targetPos.x &&
      this.frogPos.y === this.targetPos.y
    ) {
      this.handleWin();
    } else {
      this.handleError();
    }
  }

  jumpTo(gx, gy) {
    return new Promise((resolve) => {
      const startX = this.frog.x;
      const startY = this.frog.y;
      const endX = this.gridStartX + gx * this.cellSize;
      const endY = this.gridStartY + gy * this.cellSize;

      // Squash antes de saltar
      this.tweens.add({
        targets: this.frogBody,
        scaleY: 0.7,
        scaleX: 1.3,
        duration: 100,
        yoyo: true,
        onComplete: () => {
          // Salto parabólico
          this.tweens.add({
            targets: this.frog,
            x: endX,
            duration: 400,
            ease: "Linear",
          });

          this.tweens.add({
            targets: this.frog,
            y: endY - 80, // Altura del arco
            duration: 200,
            ease: "Cubic.easeOut",
            yoyo: true,
            onComplete: () => {
              // Estiramiento al caer
              this.tweens.add({
                targets: this.frogBody,
                scaleY: 0.8,
                scaleX: 1.2,
                duration: 100,
                yoyo: true,
                onComplete: resolve,
              });
            },
          });
        },
      });
    });
  }

  handleWin() {
    this.playAudio("win");
    this.showConfetti();

    // Animación de la flor
    this.tweens.add({
      targets: this.flower,
      scale: 1.5,
      angle: 360,
      duration: 1000,
    });

    this.time.delayedCall(2500, () => {
      if (this.phase === 1) {
        this.phase = 2; // Pasar a descubrimiento de bucles
        this.scene.restart();
      } else {
        // En la fase 2 (bucles), después de ganar, pasamos directamente a Puzzle2Scene
        this.scene.start("Puzzle2Scene");
      }
    });
  }

  handleError() {
    this.playAudio("error");
    this.tweens.add({
      targets: this.frog,
      alpha: 0.5,
      duration: 100,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        this.scene.restart();
      },
    });
  }

  setupAudio() {
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  playAudio(type) {
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    if (type === "bubble") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === "tick") {
      osc.type = "square";
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === "magic") {
      // Arpeggio ascendente
      [440, 554, 659, 880].forEach((freq, i) => {
        const o = this.audioCtx.createOscillator();
        const g = this.audioCtx.createGain();
        o.connect(g);
        g.connect(this.audioCtx.destination);
        o.frequency.setValueAtTime(freq, now + i * 0.1);
        g.gain.setValueAtTime(0.1, now + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.2);
        o.start(now + i * 0.1);
        o.stop(now + i * 0.1 + 0.2);
      });
    } else if (type === "win") {
      // Fanfarria alegre
      [523, 659, 783, 1046].forEach((f, i) => {
        const o = this.audioCtx.createOscillator();
        const g = this.audioCtx.createGain();
        o.connect(g);
        g.connect(this.audioCtx.destination);
        o.frequency.setValueAtTime(f, now + i * 0.1);
        g.gain.setValueAtTime(0.1, now + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.4);
        o.start(now + i * 0.1);
        o.stop(now + i * 0.1 + 0.4);
      });
    } else if (type === "error") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(50, now + 0.3);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  }

  setupParticles() {
    // Reutilizar lógica de confeti de BaseScene o personalizar aquí
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture("sparkle", 8, 8);

    this.winParticles = this.add.particles(0, 0, "sparkle", {
      emitting: false,
      speed: { min: 200, max: 400 },
      scale: { start: 1, end: 0 },
      lifespan: 1000,
      gravityY: 200,
      quantity: 50,
    });
  }

  updateGuide() {
    if (this.isExecuting) {
      this.hideGuide();
      return;
    }

    if (this.phase === 1) {
      const nextSlot = this.slots.find((s) => !s.filled);
      if (nextSlot) {
        // Encontrar una flecha "RIGHT" que esté en su posición inicial (no en un slot)
        const targetArrow = this.children.list.find(
          (c) =>
            c.type === "Container" &&
            c.getData("dir") === "RIGHT" &&
            c.getData("startX") !== undefined &&
            Math.abs(c.x - c.getData("startX")) < 5 && // Debe estar en su origen
            c.visible,
        );
        if (targetArrow) {
          this.showDragGuide(
            targetArrow.x,
            targetArrow.y,
            nextSlot.x,
            nextSlot.y,
          );
        }
      }
    } else {
      // Fase de bucle: Guía paso a paso forzada
      if (!this.loopArrow) {
        // PASO 1: Arrastrar flecha RIGHT (la de al lado) a la caja de bucle
        const rightArrow = this.children.list.find(
          (c) =>
            c.type === "Container" &&
            c.getData("dir") === "RIGHT" &&
            c.getData("startX") !== undefined &&
            Math.abs(c.x - c.getData("startX")) < 5 &&
            c.visible,
        );

        if (rightArrow && this.loopSlot) {
          this.showDragGuide(
            rightArrow.x,
            rightArrow.y,
            this.loopSlot.x,
            this.loopSlot.y,
          );
        }
      } else if (this.loopCount < 3) {
        // PASO 2: Aumentar contador hasta llegar a 3
        this.showGuideAt(
          this.loopBox.x + 95,
          this.loopBox.y - 35, // Botón PLUS
        );
      } else if (this.loopCount > 3) {
        // Si se pasó de 3, guiar al botón MINUS
        this.showGuideAt(
          this.loopBox.x + 95,
          this.loopBox.y + 25, // Botón MINUS
        );
      } else {
        // PASO 3: Ya es 3, guiar directamente al botón PLAY para ejecutar
        const { width, height } = this.scale;
        this.showGuideAt(width - 80, height - 80);
      }
    }
  }
}
