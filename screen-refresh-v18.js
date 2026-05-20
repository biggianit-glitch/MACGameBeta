// screen-refresh-v18.js
// MyAmnealCareer Quest screen refresh.
// Uses selector PNGs for avatar selection while keeping gameplay sprite sheets intact.

(function () {
  const MAC_UI = {
    avatarCursor: 0,
    mapCursor: 1
  };

  const originalPreload = preload;
  preload = function () {
    originalPreload.call(this);

    avatars.forEach(a => {
      this.load.image(a.key + "_selector", "assets/" + a.key + "_selector.png");
    });
  };

  config.scene.preload = preload;

  function pixelPanel(scene, x, y, w, h, fill = 0x071421, stroke = 0x2f80bd, alpha = 0.96) {
    scene.add.rectangle(x + 4, y + 4, w, h, 0x000000, 0.45);
    const panel = scene.add.rectangle(x, y, w, h, fill, alpha).setStrokeStyle(3, stroke);
    scene.add.rectangle(x, y - h / 2 + 9, w - 18, 5, 0xffffff, 0.13);
    scene.add.rectangle(x, y + h / 2 - 9, w - 18, 5, 0x000000, 0.24);
    return panel;
  }

  function pixelButton(scene, x, y, w, label, selected, callback, color = 0x0d4f91) {
    const fill = selected ? 0xe69a17 : color;
    const stroke = selected ? 0xffd700 : 0x2f80bd;

    const box = scene.add.rectangle(x, y, w, 48, fill, 0.98)
      .setStrokeStyle(4, stroke)
      .setInteractive({ useHandCursor: true });

    scene.add.rectangle(x, y - 12, w - 12, 7, 0xffffff, 0.16);

    const text = scene.add.text(x, y, label, {
      fontSize: "22px",
      fill: "#ffffff",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 4
    }).setOrigin(0.5);

    const go = () => {
      initAudio();

      if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume();
      }

      callback();
    };

    box.on("pointerdown", go);
    text.setInteractive({ useHandCursor: true }).on("pointerdown", go);

    return { box, text };
  }

  function drawSimpleCloud(scene, x, y, alpha = 0.8) {
    const g = scene.add.graphics();

    g.fillStyle(0xffffff, alpha);
    g.fillCircle(x, y, 24);
    g.fillCircle(x + 28, y + 5, 18);
    g.fillCircle(x - 25, y + 6, 16);

    g.fillStyle(0xc9e7ff, alpha * 0.6);
    g.fillRect(x - 46, y + 20, 92, 8);
  }

  function drawCampusMenuBackground(scene, mode = "outside") {
    const g = scene.add.graphics();

    if (mode === "inside") {
      g.fillGradientStyle(0x071421, 0x071421, 0x143050, 0x143050, 1);
      g.fillRect(0, 0, W, H);

      g.fillStyle(0x243a55, 1);
      g.fillRect(0, 0, W, 150);

      for (let x = 90; x < W; x += 120) {
        g.fillStyle(0x64b7f0, 0.65);
        g.fillRect(x, 35, 85, 105);

        g.fillStyle(0xffffff, 0.18);
        g.fillRect(x + 8, 38, 22, 96);

        g.lineStyle(2, 0x0c2238, 1);
        g.strokeRect(x, 35, 85, 105);
      }

      g.fillStyle(0x9a8f88, 1);
      g.fillRect(0, 150, W, 390);

      for (let y = 170; y < 540; y += 45) {
        g.lineStyle(1, 0x6f6a68, 0.45);
        g.strokeLineShape(new Phaser.Geom.Line(0, y, W, y));
      }

      for (let x = 0; x < W; x += 85) {
        g.lineStyle(1, 0x6f6a68, 0.35);
        g.strokeLineShape(new Phaser.Geom.Line(x, 150, x + 90, 540));
      }

      g.fillStyle(0x111b28, 0.55);
      g.fillRect(0, 0, W, H);

      g.fillStyle(0x8b6a43, 1);
      g.fillRect(700, 112, 210, 10);
      g.fillRect(706, 100, 8, 70);

      for (let i = 0; i < 9; i++) {
        g.fillRect(700 + i * 22, 120 + i * 9, 72, 8);
      }

      g.fillStyle(0x061830, 0.9);
      g.fillRect(806, 150, 110, 80);

      g.lineStyle(2, 0xe69a17, 1);
      g.strokeRect(806, 150, 110, 80);

      scene.add.text(861, 170, "RECEPTION\nTRAINING\nLABS\nWAREHOUSE", {
        fontSize: "13px",
        fill: "#ffffff",
        align: "left"
      }).setOrigin(0.5, 0);

      return;
    }

    g.fillGradientStyle(0x1795e8, 0x1795e8, 0x84d4ff, 0x84d4ff, 1);
    g.fillRect(0, 0, W, H);

    drawSimpleCloud(scene, 210, 80, 0.8);
    drawSimpleCloud(scene, 570, 65, 0.7);
    drawSimpleCloud(scene, 770, 130, 0.55);

    g.fillStyle(0xcfc9bd, 1);
    g.fillRect(0, 150, 245, 245);

    g.fillStyle(0xa9a49c, 1);
    g.fillRect(0, 142, 245, 12);

    g.fillStyle(0x143050, 1);
    g.fillRect(45, 205, 48, 125);
    g.fillRect(115, 205, 48, 125);
    g.fillRect(185, 205, 48, 125);

    g.fillStyle(0x0a1725, 1);
    g.fillRect(75, 305, 80, 90);

    g.fillStyle(0xffffff, 0.12);
    g.fillRect(50, 210, 14, 110);
    g.fillRect(120, 210, 14, 110);
    g.fillRect(190, 210, 14, 110);

    scene.add.text(140, 185, "amneal", {
      fontSize: "32px",
      fill: "#071421",
      fontStyle: "bold"
    }).setOrigin(0.5);

    g.fillStyle(0x266f38, 1);
    g.fillRect(0, 405, W, 70);

    for (let x = 260; x < W; x += 120) {
      g.fillStyle(0x1d5e2d, 1);
      g.fillCircle(x, 380, 55);

      g.fillStyle(0x2e8a42, 1);
      g.fillCircle(x - 25, 395, 34);
      g.fillCircle(x + 30, 392, 37);
    }

    g.fillStyle(0x5bb83f, 1);
    g.fillRect(0, 430, W, 20);

    g.fillStyle(0x5a351e, 1);
    g.fillRect(0, 450, W, 90);

    for (let x = 0; x < W; x += 32) {
      g.fillStyle(x % 64 ? 0x714323 : 0x3e2415, 1);
      g.fillRect(x, 462, 30, 20);
    }

    g.fillStyle(0xbdb7aa, 1);
    g.fillRoundedRect(705, 365, 170, 58, 6);

    g.lineStyle(3, 0x6c675e, 1);
    g.strokeRoundedRect(705, 365, 170, 58, 6);

    scene.add.text(790, 393, "amneal", {
      fontSize: "27px",
      fill: "#071421",
      fontStyle: "bold"
    }).setOrigin(0.5);

    g.fillStyle(0x0d4f91, 1);
    g.fillRect(290, 250, 70, 110);

    g.lineStyle(2, 0xe69a17, 1);
    g.strokeRect(290, 250, 70, 110);

    scene.add.text(325, 272, "People.\nPassion.\nPossibilities.", {
      fontSize: "14px",
      fill: "#ffffff",
      align: "center"
    }).setOrigin(0.5, 0);
  }

  function drawMenuLogo(scene, x, y) {
    scene.add.text(x, y - 68, "my", {
      fontSize: "50px",
      fill: "#ffffff",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 6
    }).setOrigin(0.5);

    scene.add.text(x, y - 24, "AMNEAL", {
      fontSize: "56px",
      fill: "#0b1d35",
      fontStyle: "bold",
      stroke: "#ffffff",
      strokeThickness: 7
    }).setOrigin(0.5);

    scene.add.text(x, y + 14, "career", {
      fontSize: "39px",
      fill: "#1a1a1a",
      fontStyle: "bold",
      stroke: "#ffffff",
      strokeThickness: 5
    }).setOrigin(0.5);

    scene.add.text(x, y + 84, "QUEST", {
      fontSize: "76px",
      fill: "#ffb000",
      fontStyle: "bold",
      stroke: "#071421",
      strokeThickness: 10
    }).setOrigin(0.5);

    const g = scene.add.graphics();

    g.lineStyle(13, 0xffb000, 1);

    const points = [
      [x + 130, y + 30],
      [x + 158, y + 12],
      [x + 188, y - 4],
      [x + 220, y - 18],
      [x + 252, y - 31],
      [x + 285, y - 43],
      [x + 315, y - 55]
    ];

    for (let i = 0; i < points.length - 1; i++) {
      g.strokeLineShape(
        new Phaser.Geom.Line(
          points[i][0],
          points[i][1],
          points[i + 1][0],
          points[i + 1][1]
        )
      );
    }

    g.fillStyle(0xffd700, 1);
    g.fillCircle(x + 328, y - 59, 24);
  }

  showStart = function (scene) {
    playMusic("start");
    clearAll(scene);
    state = "start";

    drawCampusMenuBackground(scene, "outside");
    drawMenuLogo(scene, 535, 145);

    const items = [
      ["START JOURNEY", () => showSkillSelect(scene)],
      ["CHOOSE AVATAR", () => showAvatarSelect(scene)],
      ["LEADERBOARD", () => showLeaderboard(scene)],
      ["HOW TO PLAY", () => showHowTo(scene)]
    ];

    items.forEach((item, index) => {
      pixelButton(scene, 535, 265 + index * 55, 270, item[0], index === 0, item[1], 0x0d4f91);
    });

    scene.add.text(535, 505, "PRESS START", {
      fontSize: "22px",
      fill: "#ffffff",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 4
    }).setOrigin(0.5);
  };

  showAvatarSelect = function (scene) {
    playMusic("menu");
    clearAll(scene);
    state = "avatar";

    MAC_UI.avatarCursor = selectedAvatar || 0;

    drawCampusMenuBackground(scene, "inside");

    pixelPanel(scene, 480, 70, 585, 70, 0x061830, 0xe69a17, 0.97);

    scene.add.text(480, 50, "CHOOSE YOUR PERSONA", {
      fontSize: "35px",
      fill: "#ffd55a",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 5
    }).setOrigin(0.5);

    scene.add.text(480, 86, "Select your persona to begin your career journey.", {
      fontSize: "16px",
      fill: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2
    }).setOrigin(0.5);

    avatars.forEach((avatar, index) => {
      const x = 120 + index * 180;
      const selected = index === MAC_UI.avatarCursor;

      pixelPanel(scene, x, 298, 145, 260, 0x061830, selected ? 0xffd700 : 0x2f80bd, 0.96);

      if (selected) {
        scene.add.triangle(x, 145, 0, 0, 36, 0, 18, 26, 0xffd700)
          .setStrokeStyle(2, 0x000000);
      }

      scene.add.image(x, 235, avatar.key + "_selector").setDisplaySize(105, 150);
      scene.add.ellipse(x, 302, 84, 18, 0x2b4d75, 0.7);

      const nameColor = ["#ff8fc5", "#69c8ff", "#93e26b", "#b58cff", "#ffd05a"][index];

      scene.add.text(x, 335, avatar.name.toUpperCase(), {
        fontSize: "22px",
        fill: nameColor,
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 4
      }).setOrigin(0.5);

      const trackLabels = [
        "People\nLeadership",
        "Professional",
        "Scientific/\nResearch",
        "Business\nEnablement",
        "Production,\nOperations\n& Warehouse"
      ];

      scene.add.text(x, 385, trackLabels[index], {
        fontSize: "13px",
        fill: "#ffffff",
        align: "center",
        lineSpacing: 1
      }).setOrigin(0.5);

      const hitArea = scene.add.rectangle(x, 298, 145, 260, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true });

      hitArea.on("pointerdown", () => {
        selectedAvatar = index;
        showSkillSelect(scene);
      });
    });

    pixelButton(scene, 380, 485, 210, "BACK", () => showStart(scene), false, 0x8e2c2c);

    pixelButton(scene, 580, 485, 210, "CONFIRM", () => {
      selectedAvatar = MAC_UI.avatarCursor;
      showSkillSelect(scene);
    }, true, 0x1b7f3a);

    scene.add.text(480, 525, "Use arrows/controller to browse | ENTER to select | ESC to go back", {
      fontSize: "12px",
      fill: "#d8e6f3"
    }).setOrigin(0.5);
  };

  showMap = function (scene) {
    playMusic("menu");
    clearAll(scene);
    state = "map";

    MAC_UI.mapCursor = Math.min(Math.max(unlockedLevel, 1), levels.length);

    const g = scene.add.graphics();

    g.fillGradientStyle(0x1b8ad7, 0x1b8ad7, 0x7ed8ff, 0x7ed8ff, 1);
    g.fillRect(0, 0, W, H);

    g.fillStyle(0x2f9a42, 1);
    g.fillEllipse(465, 275, 780, 330);

    g.fillStyle(0x4bb85c, 1);
    g.fillEllipse(440, 270, 650, 250);

    g.fillStyle(0x2a7a3b, 0.35);

    for (let i = 0; i < 80; i++) {
      g.fillCircle(110 + (i * 83) % 750, 135 + (i * 47) % 300, Phaser.Math.Between(8, 19));
    }

    g.fillStyle(0x1c87c9, 1);
    g.fillEllipse(430, 335, 280, 45);

    g.fillStyle(0x63c4f2, 0.5);
    g.fillEllipse(430, 330, 230, 20);

    g.fillStyle(0x1b5e95, 1);
    g.fillRect(0, 430, W, 110);

    titleText(scene, 480, 34, "CAREER JOURNEY MAP", 30);

    pixelPanel(scene, 480, 78, 420, 34, 0x0a2744, 0x2f80bd, 0.96);

    scene.add.text(480, 78, "MYAMNEALCAREER QUEST: BUILD. GROW. IMPACT.", {
      fontSize: "13px",
      fill: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    const nodes = [
      [82, 215, "Corporate\nLobby"],
      [255, 145, "R&D\nLab"],
      [420, 145, "Manufacturing\nFloor"],
      [580, 145, "Conference\nCenter"],
      [730, 145, "Supply\nChain"],
      [760, 315, "Field\nSales"],
      [610, 385, "Quality"],
      [450, 405, "Learning\nHub"],
      [300, 385, "Innovation\nCenter"],
      [120, 385, "Career\nSummit"]
    ];

    for (let i = 0; i < nodes.length; i++) {
      const levelNumber = i + 1;
      const x = nodes[i][0];
      const y = nodes[i][1];

      const completed = levelNumber < unlockedLevel;
      const current = levelNumber === unlockedLevel;
      const locked = levelNumber > unlockedLevel;

      const stroke = current ? 0xffd700 : completed ? 0x00ff88 : 0x777777;

      pixelPanel(scene, x, y, 116, 82, 0x061830, stroke, 0.93);

      scene.add.circle(x - 46, y - 35, 18, current ? 0xffd700 : completed ? 0x1b7f3a : 0x555555)
        .setStrokeStyle(3, 0xffffff);

      scene.add.text(x - 46, y - 35, completed ? "✓" : locked ? "L" : String(levelNumber), {
        fontSize: completed ? "19px" : "18px",
        fill: "#ffffff",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3
      }).setOrigin(0.5);

      scene.add.text(x, y + 17, nodes[i][2], {
        fontSize: "11px",
        fill: "#ffffff",
        align: "center",
        fontStyle: "bold",
        lineSpacing: 0
      }).setOrigin(0.5);

      if (levelNumber <= unlockedLevel) {
        const hitArea = scene.add.rectangle(x, y, 116, 82, 0xffffff, 0.001)
          .setInteractive({ useHandCursor: true });

        hitArea.on("pointerdown", () => startLevel(scene, levelNumber));
      }
    }

    scene.add.text(360, 292, "★\nGIG SPOT", {
      fontSize: "12px",
      fill: "#ffd700",
      align: "center",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 3
    }).setOrigin(0.5);

    scene.add.text(492, 292, "MENTOR\nSPOT", {
      fontSize: "12px",
      fill: "#66ccff",
      align: "center",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 3
    }).setOrigin(0.5);

    pixelPanel(scene, 300, 490, 300, 70, 0x061830, 0xe69a17, 0.94);

    scene.add.text(170, 472, "WORLD\n1", {
      fontSize: "15px",
      fill: "#ffffff",
      align: "center",
      fontStyle: "bold"
    }).setOrigin(0.5);

    scene.add.text(290, 472, "LEVEL\n1-" + unlockedLevel, {
      fontSize: "15px",
      fill: "#ffd55a",
      align: "center",
      fontStyle: "bold"
    }).setOrigin(0.5);

    scene.add.text(390, 480, (levels[unlockedLevel - 1] || levels[0]).name.toUpperCase(), {
      fontSize: "13px",
      fill: "#ffb000",
      fontStyle: "bold"
    }).setOrigin(0.5);

    pixelPanel(scene, 610, 490, 260, 70, 0x061830, 0xe69a17, 0.94);

    scene.add.text(540, 480, "SCORE\n" + String(score).padStart(5, "0"), {
      fontSize: "15px",
      fill: "#ffffff",
      align: "center",
      fontStyle: "bold"
    }).setOrigin(0.5);

    scene.add.text(685, 480, "TRIES\n" + "♥ ".repeat(attempts), {
      fontSize: "15px",
      fill: "#ffffff",
      align: "center",
      fontStyle: "bold"
    }).setOrigin(0.5);

    scene.add.text(480, 527, "Select your next career step. ENTER = select, ESC = back", {
      fontSize: "12px",
      fill: "#d8e6f3"
    }).setOrigin(0.5);
  };

  const originalUpdate = update;

  update = function () {
    if (state === "avatar") {
      if (Phaser.Input.Keyboard.JustDown(cursors.left)) {
        MAC_UI.avatarCursor = (MAC_UI.avatarCursor + avatars.length - 1) % avatars.length;
        showAvatarSelect(this);
        return;
      }

      if (Phaser.Input.Keyboard.JustDown(cursors.right)) {
        MAC_UI.avatarCursor = (MAC_UI.avatarCursor + 1) % avatars.length;
        showAvatarSelect(this);
        return;
      }

      if (Phaser.Input.Keyboard.JustDown(enterKey) || Phaser.Input.Keyboard.JustDown(spaceKey)) {
        selectedAvatar = MAC_UI.avatarCursor;
        showSkillSelect(this);
        return;
      }

      if (Phaser.Input.Keyboard.JustDown(escKey)) {
        showStart(this);
        return;
      }

      return;
    }

    if (state === "map") {
      if (Phaser.Input.Keyboard.JustDown(cursors.left) || Phaser.Input.Keyboard.JustDown(cursors.up)) {
        MAC_UI.mapCursor = Math.max(1, MAC_UI.mapCursor - 1);
      }

      if (Phaser.Input.Keyboard.JustDown(cursors.right) || Phaser.Input.Keyboard.JustDown(cursors.down)) {
        MAC_UI.mapCursor = Math.min(unlockedLevel, MAC_UI.mapCursor + 1);
      }

      if (Phaser.Input.Keyboard.JustDown(enterKey) || Phaser.Input.Keyboard.JustDown(spaceKey)) {
        startLevel(this, MAC_UI.mapCursor);
        return;
      }

      if (Phaser.Input.Keyboard.JustDown(escKey)) {
        showStart(this);
        return;
      }

      return;
    }

    originalUpdate.call(this);
  };

  config.scene.update = update;
})();
