import BaseScene from "./BaseScene.js";

export default class Puzzle2Scene extends BaseScene {
  constructor() {
    super("Puzzle2Scene");
    this.level = 1;
    this.isExecuting = false;
    this.slots = { if: null, then: null };
    this.rule = { object: null, direction: null };
    this.objectsInPath = [];
  }

  create() {
    const { width, height } = this.scale;
    this.createEnhancedBackground();

    // Título
    this.add
      .text(width / 2, 40, "CONSTRUCTOR DE REGLAS: SI... ENTONCES...", {
        fontSize: "32px",
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.initLevel();
    this.setupAudio();
  }

  createEnhancedBackground() {
    const { width, height } = this.scale;

    // Fondo con degradado de cielo al atardecer/bosque
    const bgGraphics = this.add.graphics();
    bgGraphics.fillGradientStyle(0x0c4a6e, 0x0c4a6e, 0x064e3b, 0x064e3b, 1);
    bgGraphics.fillRect(0, 0, width, height);
    bgGraphics.setDepth(-2); // Asegurar que esté al fondo absoluto

    // Nubes moviéndose lentamente
    for (let i = 0; i < 5; i++) {
      const cloud = this.add.graphics();
      cloud.fillStyle(0xffffff, 0.1);
      const cx = Phaser.Math.Between(0, width);
      const cy = Phaser.Math.Between(50, 150);
      cloud.fillEllipse(0, 0, 150, 40);
      cloud.fillEllipse(20, -15, 100, 50);
      cloud.setPosition(cx, cy);
      cloud.setDepth(-1);

      this.tweens.add({
        targets: cloud,
        x: width + 200,
        duration: Phaser.Math.Between(60000, 100000),
        repeat: -1,
        onRepeat: () => (cloud.x = -200),
      });
    }

    // Partículas de hojas flotando (Efecto de bosque vivo)
    const leafColors = [0x22c55e, 0x16a34a, 0x15803d, 0x166534];
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const leaf = this.add.graphics();
      leaf.fillStyle(Phaser.Utils.Array.GetRandom(leafColors), 0.4);
      leaf.fillEllipse(0, 0, 8, 4);
      leaf.setPosition(x, y);
      leaf.setDepth(1); // Sobre el fondo pero bajo los iconos

      this.tweens.add({
        targets: leaf,
        x: x + Phaser.Math.Between(-100, 100),
        y: y + height + 50,
        angle: 360,
        duration: Phaser.Math.Between(5000, 10000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 5000),
        onRepeat: () => {
          leaf.y = -50;
          leaf.x = Phaser.Math.Between(0, width);
        },
      });
    }
  }

  initLevel() {
    const { width, height } = this.scale;

    // Limpiar elementos previos si existen
    if (this.owl) this.owl.destroy();
    if (this.ghostOwl) this.ghostOwl.destroy();
    if (this.pathGraphics) this.pathGraphics.destroy();
    this.objectsInPath.forEach((obj) => obj.destroy());
    this.objectsInPath = [];
    this.rule = { object: null, direction: null };
    this.isExecuting = false;

    // 1. Dibujar el camino con bifurcación
    this.drawForkPath();

    // 2. Crear objetos en el camino según el nivel
    this.setupLevelObjects();

    // 3. Crear el Búho en la posición inicial
    this.createOwl(50, height / 2);
    this.createGhostOwl(); // Crear el fantasma para el preview

    // 4. Mover búho a la bifurcación automáticamente al inicio
    this.time.delayedCall(500, () => {
      this.playAudio("hoo");
      this.tweens.add({
        targets: this.owl,
        x: 400,
        duration: 1500,
        ease: "Power1",
      });
    });

    // 5. Crear Panel de Regla
    this.createRulePanel();

    // 6. Crear Panel Lateral de Íconos
    this.createIconPanel();

    // 7. Botón Ejecutar
    this.createPlayButton();

    this.createHandGuide();
    this.updateGuide();
  }

  createGhostOwl() {
    this.ghostOwl = this.add.container(400, this.scale.height / 2);
    const g = this.add.graphics();

    // Cuerpo simplificado semitransparente
    g.fillStyle(0x78350f, 0.3);
    g.fillEllipse(0, 0, 40, 50);
    g.fillStyle(0xffffff, 0.3);
    g.fillCircle(-10, -10, 8);
    g.fillCircle(10, -10, 8);

    this.ghostOwl.add(g);
    this.ghostOwl.setScale(0.7); // Versión pequeña
    this.ghostOwl.setVisible(false);
  }

  updateGhostPreview() {
    if (!this.ghostOwl || this.isExecuting) return;

    if (this.rule.object && this.rule.direction) {
      this.ghostOwl.setVisible(true);
      const targetY =
        this.rule.direction === "LEFT"
          ? this.scale.height / 2 - 110
          : this.scale.height / 2 + 110;

      this.tweens.add({
        targets: this.ghostOwl,
        x: this.scale.width - 150,
        y: targetY,
        alpha: 0.4,
        duration: 1000,
        ease: "Sine.easeInOut",
        onStart: () => {
          this.ghostOwl.setPosition(400, this.scale.height / 2);
        },
      });
    } else {
      this.ghostOwl.setVisible(false);
    }
  }

  drawForkPath() {
    const { width, height } = this.scale;
    this.pathGraphics = this.add.graphics();
    const g = this.pathGraphics;

    // Colores más realistas
    const pathColor = 0xe7d4b5; // Arena con más textura
    const grassColor = 0x14532d; // Verde oscuro para el fondo de hierba
    const pathBorder = 0xd4b483;

    // Sombra del camino para profundidad
    g.fillStyle(0x000000, 0.2);
    g.fillRoundedRect(55, height / 2 - 35, 400, 80, 10);

    // Tronco principal
    g.fillStyle(pathBorder, 1);
    g.fillRoundedRect(50, height / 2 - 40, 405, 85, 10);
    g.fillStyle(pathColor, 1);
    g.fillRoundedRect(50, height / 2 - 40, 400, 80, 10);

    // Añadir textura de "piedras" al camino
    g.fillStyle(0xd4b483, 0.3);
    for (let i = 0; i < 50; i++) {
      g.fillCircle(
        Phaser.Math.Between(60, 440),
        height / 2 + Phaser.Math.Between(-35, 35),
        Phaser.Math.Between(1, 4),
      );
    }

    // Bifurcación en Y con bordes y textura
    const drawBranch = (isTop) => {
      const offset = isTop ? -1 : 1;
      const targetY = height / 2 + offset * 110;

      // Sombra
      g.lineStyle(85, 0x000000, 0.15);
      g.beginPath();
      g.moveTo(450, height / 2);
      g.lineTo(650, targetY);
      g.lineTo(width - 50, targetY);
      g.strokePath();

      // Borde
      g.lineStyle(85, pathBorder, 1);
      g.beginPath();
      g.moveTo(450, height / 2);
      g.lineTo(650, targetY);
      g.lineTo(width - 50, targetY);
      g.strokePath();

      // Relleno principal
      g.lineStyle(80, pathColor, 1);
      g.beginPath();
      g.moveTo(450, height / 2);
      g.lineTo(650, targetY);
      g.lineTo(width - 50, targetY);
      g.strokePath();

      // Textura piedras en rama
      g.fillStyle(0xd4b483, 0.3);
      for (let i = 0; i < 40; i++) {
        const rx = Phaser.Math.Between(450, width - 60);
        const ry = targetY + Phaser.Math.Between(-35, 35);
        g.fillCircle(rx, ry, Phaser.Math.Between(1, 3));
      }
    };

    drawBranch(true); // Superior
    drawBranch(false); // Inferior

    // Decoración de hierba mucho más densa y realista
    for (let i = 0; i < 300; i++) {
      const x = Phaser.Math.Between(20, width - 20);
      const y = Phaser.Math.Between(20, height - 150);

      // Evitar dibujar sobre el camino principal (simple check)
      if (Math.abs(y - height / 2) > 60 || x > 450) {
        g.lineStyle(
          Phaser.Math.Between(1, 3),
          0x22c55e,
          Phaser.Math.FloatBetween(0.3, 0.8),
        );
        const h = Phaser.Math.Between(5, 15);
        g.lineBetween(x, y, x + Phaser.Math.Between(-2, 2), y - h);

        // Ocasionalmente una pequeña flor silvestre
        if (Math.random() > 0.98) {
          g.fillStyle(0xf472b6, 1);
          g.fillCircle(x, y - h, 2);
        }
      }
    }
  }

  createOwl(x, y) {
    this.owl = this.add.container(x, y);
    const body = this.add.graphics();
    const face = this.add.graphics();

    // Sombra proyectada en el suelo
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.2);
    shadow.fillEllipse(0, 35, 50, 15);
    this.owl.add(shadow);

    // Cuerpo con degradado simulado y plumas
    body.fillStyle(0x78350f, 1);
    body.fillEllipse(0, 0, 60, 75);

    // Textura de plumas
    body.lineStyle(1, 0x451a03, 0.3);
    for (let i = 0; i < 15; i++) {
      const px = Phaser.Math.Between(-20, 20);
      const py = Phaser.Math.Between(-20, 30);
      body.strokeEllipse(px, py, 10, 5);
    }

    // Pecho plumoso
    body.fillStyle(0xd97706, 1);
    body.fillEllipse(0, 15, 45, 50);
    body.lineStyle(1, 0xb45309, 0.4);
    for (let i = 0; i < 10; i++) {
      body.strokeEllipse(
        Phaser.Math.Between(-15, 15),
        Phaser.Math.Between(0, 35),
        8,
        4,
      );
    }

    // Alas con forma más orgánica
    const drawRealisticWing = (side) => {
      const w = this.add.graphics();
      w.fillStyle(0x78350f, 1);
      w.beginPath();
      w.moveTo(side * 25, -10);
      // Usando curvas de Bezier compatibles con Phaser Graphics
      const curve = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(side * 25, -10),
        new Phaser.Math.Vector2(side * 50, 0),
        new Phaser.Math.Vector2(side * 25, 40),
      );
      const points = curve.getPoints(10);
      points.forEach((p) => w.lineTo(p.x, p.y));
      w.closePath();
      w.fillPath();
      w.lineStyle(2, 0x451a03, 0.5);
      w.strokePath();
      return w;
    };
    this.leftWing = drawRealisticWing(-1);
    this.rightWing = drawRealisticWing(1);

    // Cara (ojos y pico)
    face.fillStyle(0xffffff, 1);
    face.fillCircle(-18, -18, 18);
    face.fillCircle(18, -18, 18);

    // Iris detallado
    const drawEye = (ex) => {
      face.fillStyle(0xf97316, 1);
      face.fillCircle(ex, -18, 10);
      face.fillStyle(0x000000, 1);
      face.fillCircle(ex, -18, 6);
      // Brillo en el ojo
      face.fillStyle(0xffffff, 0.8);
      face.fillCircle(ex - 3, -21, 3);
    };
    drawEye(-18);
    drawEye(18);

    // Cejas "plumas"
    face.lineStyle(4, 0x451a03, 1);
    face.beginPath();
    face.moveTo(-35, -35);
    face.lineTo(-10, -25);
    face.moveTo(35, -35);
    face.lineTo(10, -25);
    face.strokePath();

    // Pico ganchudo
    face.fillStyle(0xfacc15, 1);
    face.beginPath();
    face.moveTo(-6, -8);
    face.lineTo(6, -8);
    face.lineTo(0, 8);
    face.closePath();
    face.fillPath();
    face.lineStyle(1, 0x92400e, 1);
    face.strokePath();

    this.owl.add([body, this.leftWing, this.rightWing, face]);
    this.owlFace = face;

    // Animación Idle: Giro de cabeza y parpadeo ocasional
    this.tweens.add({
      targets: face,
      angle: 10,
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Pequeño balanceo del cuerpo
    this.tweens.add({
      targets: [body, face],
      y: 2,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  setupLevelObjects() {
    const { width, height } = this.scale;
    const branchY = [height / 2 - 110, height / 2 + 110];
    const targetX = width - 150;

    if (this.level === 1) {
      // Nivel 1: Manzana en rama izquierda (arriba)
      const side = Phaser.Math.Between(0, 1);
      this.targetSide = side; // 0: Izquierda/Arriba, 1: Derecha/Abajo
      this.createObjectAt("apple", targetX, branchY[side]);
      this.correctObject = "apple";
      this.correctDir = side === 0 ? "LEFT" : "RIGHT";
    } else if (this.level === 2) {
      // Nivel 2: Estrella y Manzana
      this.createObjectAt("apple", targetX, branchY[0]);
      this.createObjectAt("star", targetX, branchY[1]);
      const chosen = Phaser.Utils.Array.GetRandom(["apple", "star"]);
      this.correctObject = chosen;
      this.correctDir = chosen === "apple" ? "LEFT" : "RIGHT";
    } else if (this.level === 3) {
      // Nivel 3: Lluvia en una rama, la otra vacía
      const side = Phaser.Math.Between(0, 1);
      this.createObjectAt("rain", targetX, branchY[side]);
      this.correctObject = "NOT_rain"; // SI NO hay lluvia
      this.correctDir = side === 0 ? "RIGHT" : "LEFT";
    }
  }

  // Nueva función para dibujar formas de forma consistente
  drawShape(g, type, scale = 1) {
    g.clear();
    g.setScale(scale);

    if (type === "apple") {
      g.fillStyle(0xef4444, 1);
      g.fillCircle(0, 0, 22);
      g.fillStyle(0xdc2626, 1);
      g.fillEllipse(-5, 5, 15, 10);
      g.fillStyle(0x78350f, 1);
      g.fillRect(-2, -28, 4, 12);
      g.fillStyle(0x22c55e, 1);
      g.beginPath();
      const leafCurve = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(0, -22),
        new Phaser.Math.Vector2(15, -30),
        new Phaser.Math.Vector2(12, -15),
      );
      leafCurve.getPoints(10).forEach((p) => g.lineTo(p.x, p.y));
      g.closePath();
      g.fillPath();
    } else if (type === "star") {
      g.lineStyle(3, 0xca8a04, 1);
      g.fillStyle(0xfacc15, 1);
      const points = [];
      for (let i = 0; i < 5; i++) {
        const angle = (i * 72 - 90) * (Math.PI / 180);
        points.push(Math.cos(angle) * 28, Math.sin(angle) * 28);
        const innerAngle = (i * 72 + 36 - 90) * (Math.PI / 180);
        points.push(Math.cos(innerAngle) * 12, Math.sin(innerAngle) * 12);
      }
      g.fillPoints(points, true);
      g.strokePath();
    } else if (type === "rain") {
      g.fillStyle(0x9ca3af, 1);
      g.fillCircle(-10, 0, 15);
      g.fillCircle(10, 0, 15);
      g.fillCircle(0, -10, 18);
      g.fillRect(-10, 0, 20, 15);
      g.lineStyle(2, 0x60a5fa, 0.8);
      for (let i = 0; i < 4; i++) {
        const rx = -10 + i * 7;
        g.lineBetween(rx, 10, rx - 3, 20);
      }
    } else if (type === "YES") {
      g.lineStyle(6, 0x16a34a, 1);
      g.beginPath();
      g.moveTo(-15, 0);
      g.lineTo(-5, 15);
      g.lineTo(15, -15);
      g.strokePath();
    } else if (type === "NOT") {
      g.lineStyle(6, 0xdc2626, 1);
      g.lineBetween(-15, -15, 15, 15);
      g.lineBetween(15, -15, -15, 15);
    } else if (type === "LEFT") {
      g.fillStyle(0x6366f1, 1);
      g.beginPath();
      g.moveTo(15, 0);
      g.lineTo(-15, 0);
      g.lineTo(-5, -10);
      g.moveTo(-15, 0);
      g.lineTo(-5, 10);
      g.strokePath();
      g.lineStyle(4, 0x6366f1, 1);
      g.lineBetween(-15, 0, 15, 0);
    } else if (type === "RIGHT") {
      g.fillStyle(0x6366f1, 1);
      g.beginPath();
      g.moveTo(-15, 0);
      g.lineTo(15, 0);
      g.lineTo(5, -10);
      g.moveTo(15, 0);
      g.lineTo(5, 10);
      g.strokePath();
      g.lineStyle(4, 0x6366f1, 1);
      g.lineBetween(-15, 0, 15, 0);
    }
  }

  createObjectAt(type, x, y) {
    const container = this.add.container(x, y);

    // Sombra del objeto
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.15);
    shadow.fillEllipse(0, 25, 30, 10);
    container.add(shadow);

    const emojiMap = {
      apple: "🍎",
      star: "⭐",
      rain: "🌧️",
      flower: "🌸",
    };

    const txt = this.addEmojiText(0, 0, emojiMap[type] || "❓", {
      fontSize: "50px",
      color: "#ffffff", // Blanco para los objetos del camino sobre el fondo oscuro
    }).setOrigin(0.5);
    container.add(txt);
    this.objectsInPath.push(container);

    this.tweens.add({
      targets: container,
      y: y - 15,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  createRulePanel() {
    const { width, height } = this.scale;
    const panelX = width / 2;
    const panelY = height - 80;

    const bg = this.add.graphics();
    bg.fillStyle(0x1e293b, 0.8);
    bg.fillRoundedRect(panelX - 200, panelY - 50, 400, 100, 20);
    bg.lineStyle(4, 0x334155, 1);
    bg.strokeRoundedRect(panelX - 200, panelY - 50, 400, 100, 20);

    this.add
      .text(panelX - 180, panelY - 10, "SI", {
        fontSize: "24px",
        color: "#94a3b8",
      })
      .setOrigin(0.5);
    this.add
      .text(panelX, panelY - 10, "→", { fontSize: "32px", color: "#94a3b8" })
      .setOrigin(0.5);

    // Slots
    const createSlot = (sx, sy, label) => {
      const slot = this.add.graphics();
      slot.lineStyle(3, 0xffffff, 0.3);
      // Borde punteado animado aproximado
      this.tweens.add({
        targets: slot,
        alpha: 0.5,
        duration: 800,
        yoyo: true,
        repeat: -1,
      });
      slot.strokeRoundedRect(sx - 35, sy - 35, 70, 70, 10);
      return { x: sx, y: sy, filled: false };
    };

    this.slots.if = createSlot(panelX - 90, panelY, "IF");
    this.slots.then = createSlot(panelX + 90, panelY, "THEN");
  }

  createIconPanel() {
    const { width, height } = this.scale;
    const startY = 120; // Subido para dar más espacio abajo
    const spacing = 90; // Reducido el espacio entre círculos para que quepan todos

    // Cantidad mínima de objetos según el nivel
    let relevantTypes = [];
    if (this.level === 1) {
      relevantTypes = ["apple", "LEFT", "RIGHT"];
    } else if (this.level === 2) {
      relevantTypes = ["apple", "star", "LEFT", "RIGHT"];
    } else {
      relevantTypes = ["NOT", "LEFT", "RIGHT"];
    }

    const allIcons = [
      { type: "apple", emoji: "🍎" },
      { type: "star", emoji: "⭐" },
      { type: "NOT", emoji: "✗" },
      { type: "LEFT", emoji: "←" },
      { type: "RIGHT", emoji: "→" },
    ];

    const filteredIcons = [];
    for (let i = 0; i < allIcons.length; i++) {
      if (relevantTypes.indexOf(allIcons[i].type) !== -1) {
        filteredIcons.push(allIcons[i]);
      }
    }

    filteredIcons.forEach((data, i) => {
      this.createDraggableIcon(80, startY + i * spacing, data); // Movido a x=80
    });
  }

  createDraggableIcon(x, y, data) {
    const container = this.add.container(x, y);
    const g = this.add.graphics();

    // Fondo del círculo con un color Slate (Azul pizarra) más elegante
    g.fillStyle(0x475569, 1);
    g.fillCircle(0, 0, 38);
    g.lineStyle(3, 0xf8fafc, 1); // Borde claro para resaltar
    g.strokeCircle(0, 0, 38);

    // Usar el emoji de los datos originales
    const emojiMap = {
      apple: "🍎",
      star: "⭐",
      rain: "🌧️",
      NOT: "✗",
      YES: "✓",
      LEFT: "←",
      RIGHT: "→",
    };

    const txt = this.addEmojiText(0, 0, emojiMap[data.type] || "❓", {
      fontSize: "42px",
      color: "#ffffff", // Texto blanco para los símbolos que no son emojis
    }).setOrigin(0.5);

    container.add([g, txt]);
    container.setDepth(2000);

    container.setData("type", data.type);
    container.setData("startX", x);
    container.setData("startY", y);

    g.setInteractive(
      new Phaser.Geom.Circle(0, 0, 38),
      Phaser.Geom.Circle.Contains,
    );
    this.input.setDraggable(g);

    g.on("drag", (pointer) => {
      if (this.isExecuting) return;
      container.x = pointer.x;
      container.y = pointer.y;
      container.setDepth(3000);
      this.hideGuide();
    });

    g.on("dragend", () => {
      if (this.isExecuting) return;
      let placed = false;

      for (let key in this.slots) {
        const slot = this.slots[key];
        const dist = Phaser.Math.Distance.Between(
          container.x,
          container.y,
          slot.x,
          slot.y,
        );
        if (dist < 50) {
          container.x = slot.x;
          container.y = slot.y;
          this.rule[key === "if" ? "object" : "direction"] = data.type;
          placed = true;
          this.playAudio("tick");
          this.updateGhostPreview();
          break;
        }
      }

      if (!placed) {
        this.tweens.add({
          targets: container,
          x: container.getData("startX"),
          y: container.getData("startY"),
          duration: 300,
          onComplete: () => container.setDepth(2000),
        });
      } else {
        this.updateGuide();
      }
    });
  }

  createPlayButton() {
    const { width, height } = this.scale;
    const btn = this.add.container(width - 80, height - 80);
    const g = this.add.graphics();
    g.fillStyle(0x22c55e, 1);
    g.fillCircle(0, 0, 40);
    g.lineStyle(3, 0xffffff, 1);
    g.strokeCircle(0, 0, 40);

    const txt = this.add
      .text(0, 0, "▶", { fontSize: "32px", color: "#ffffff" })
      .setOrigin(0.5);
    btn.add([g, txt]);

    g.setInteractive(
      new Phaser.Geom.Circle(0, 0, 40),
      Phaser.Geom.Circle.Contains,
    );
    g.on("pointerdown", () => this.executeRule());
  }

  async executeRule() {
    if (this.isExecuting || !this.rule.object || !this.rule.direction) return;
    this.isExecuting = true;
    this.hideGuide();
    if (this.ghostOwl) this.ghostOwl.setVisible(false);

    // 1. Evaluar regla
    let isCorrect = false;
    if (this.level === 1 || this.level === 2) {
      isCorrect =
        this.rule.object === this.correctObject &&
        this.rule.direction === this.correctDir;
    } else if (this.level === 3) {
      // Lógica SI NO (Usando ícono X)
      isCorrect =
        this.rule.object === "NOT" && this.rule.direction === this.correctDir;
    }

    // 2. Mover búho según la regla
    const targetY =
      this.rule.direction === "LEFT"
        ? this.scale.height / 2 - 110
        : this.scale.height / 2 + 110;
    const finalX = isCorrect ? this.scale.width - 150 : 600; // Si falla, choca a mitad de camino

    await new Promise((resolve) => {
      this.tweens.add({
        targets: this.owl,
        x: finalX,
        y: targetY,
        duration: 1500,
        onComplete: resolve,
      });
    });

    if (isCorrect) {
      this.handleWin();
    } else {
      this.playAudio("boing");
      // Tween bounce de rebote
      this.tweens.add({
        targets: this.owl,
        x: this.owl.x - 50,
        y: this.owl.y + (this.rule.direction === "LEFT" ? 20 : -20),
        duration: 500,
        ease: "Bounce.easeOut",
        onComplete: () => {
          this.time.delayedCall(800, () => this.scene.restart());
        },
      });
    }
  }

  handleWin() {
    this.playAudio("correct");
    this.showStarCelebration();

    // Animación aleteo (tween rápido de rotación de alas)
    this.tweens.add({
      targets: [this.leftWing, this.rightWing],
      angle: 60,
      duration: 100,
      yoyo: true,
      repeat: 15,
    });

    this.time.delayedCall(3000, () => {
      this.level++;
      if (this.level > 3) {
        this.showFinalCongratulations();
      } else {
        this.scene.restart();
      }
    });
  }

  showFinalCongratulations() {
    const { width, height } = this.scale;

    // Fondo oscurecido
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(6000);

    const container = this.add.container(width / 2, height / 2).setDepth(6001);

    // Panel central
    const panel = this.add.graphics();
    panel.fillStyle(0x1e293b, 1);
    panel.lineStyle(4, 0x3b82f6, 1);
    panel.fillRoundedRect(-250, -150, 500, 300, 20);
    panel.strokeRoundedRect(-250, -150, 500, 300, 20);

    const title = this.add
      .text(0, -80, "¡FELICITACIONES!", {
        fontSize: "42px",
        color: "#facc15",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    const subtitle = this.add
      .text(0, -20, "Has dominado la lógica del búho", {
        fontSize: "24px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    // Botón Volver a Jugar
    const btn = this.add.container(0, 70);
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x22c55e, 1);
    btnBg.fillRoundedRect(-120, -30, 240, 60, 15);
    btnBg.lineStyle(3, 0xffffff, 1);
    btnBg.strokeRoundedRect(-120, -30, 240, 60, 15);

    const btnText = this.add
      .text(0, 0, "VOLVER A JUGAR", {
        fontSize: "22px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    btn.add([btnBg, btnText]);
    btnBg.setInteractive(
      new Phaser.Geom.Rectangle(-120, -30, 240, 60),
      Phaser.Geom.Rectangle.Contains,
    );

    btnBg.on("pointerover", () => btn.setScale(1.1));
    btnBg.on("pointerout", () => btn.setScale(1));
    btnBg.on("pointerdown", () => {
      this.level = 1;
      this.scene.start("ArrowPuzzleScene"); // Reiniciar desde el primer puzzle del juego
    });

    container.add([panel, title, subtitle, btn]);

    // Animación de entrada
    container.setScale(0);
    this.tweens.add({
      targets: container,
      scale: 1,
      duration: 500,
      ease: "Back.easeOut",
    });

    this.showStarCelebration(); // Reutilizar explosión de estrellas
  }

  showStarCelebration() {
    const { width, height } = this.scale;
    for (let i = 0; i < 30; i++) {
      const star = this.add.graphics();
      const color = Phaser.Display.Color.RandomRGB().color;
      star.fillStyle(color, 1);

      // Polígono de estrella pequeño
      const points = [];
      for (let j = 0; j < 5; j++) {
        const angle = (j * 72 - 90) * (Math.PI / 180);
        points.push(Math.cos(angle) * 10, Math.sin(angle) * 10);
        const innerAngle = (j * 72 + 36 - 90) * (Math.PI / 180);
        points.push(Math.cos(innerAngle) * 4, Math.sin(innerAngle) * 4);
      }
      star.fillPoints(points, true);
      star.setPosition(this.owl.x, this.owl.y);

      this.tweens.add({
        targets: star,
        x: star.x + Phaser.Math.Between(-200, 200),
        y: star.y + Phaser.Math.Between(-200, 200),
        alpha: 0,
        scale: 2,
        angle: 360,
        duration: 1500,
        onComplete: () => star.destroy(),
      });
    }
  }

  setupAudio() {
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  playAudio(type) {
    const now = this.audioCtx.currentTime;
    if (type === "hoo") {
      this.playTone(220, now, 0.2);
      this.playTone(196, now + 0.2, 0.4);
    } else if (type === "tick") {
      this.playTone(880, now, 0.05);
    } else if (type === "correct") {
      [523.25, 659.25, 783.99].forEach((f, i) =>
        this.playTone(f, now + i * 0.1, 0.3),
      );
    } else if (type === "boing") {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start();
      osc.stop(now + 0.3);
    }
  }

  playTone(freq, start, duration) {
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.1, start);
    gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
    osc.start(start);
    osc.stop(start + duration);
  }

  updateGuide() {
    if (this.isExecuting) return;

    if (!this.rule.object) {
      // En nivel 3, el objetivo es el ícono NOT
      const searchType = this.level === 3 ? "NOT" : this.correctObject;
      const target = this.children.list.find(
        (c) => c.getData && c.getData("type") === searchType,
      );
      if (target)
        this.showDragGuide(
          target.x,
          target.y,
          this.slots.if.x,
          this.slots.if.y,
        );
    } else if (!this.rule.direction) {
      const target = this.children.list.find(
        (c) => c.getData && c.getData("type") === this.correctDir,
      );
      if (target)
        this.showDragGuide(
          target.x,
          target.y,
          this.slots.then.x,
          this.slots.then.y,
        );
    } else {
      const { width, height } = this.scale;
      this.showGuideAt(width - 80, height - 80);
    }
  }
}
