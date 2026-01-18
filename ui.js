
function drawBackgroundGradient() {
  const [c1, c2] = currentTheme.backgroundGradient;
  const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Drawing helpers
function drawBlock(x, y, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(x, y, BLOCK, BLOCK);

  // Reduced shadow cost: only small blur
  ctx.shadowColor = currentTheme.glowColor;
  ctx.shadowBlur = 8;
  ctx.strokeStyle = currentTheme.glowColor;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 1, y + 1, BLOCK - 2, BLOCK - 2);

  ctx.shadowBlur = 0;
  const grad = ctx.createLinearGradient(x, y, x, y + BLOCK);
  grad.addColorStop(0, "rgba(255,255,255,0.18)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.05)");
  grad.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = grad;
  ctx.fillRect(x + 1, y + 1, BLOCK - 2, BLOCK - 2);

  ctx.restore();
}

function drawMiniBlock(x, y, size, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.strokeRect(x, y, size, size);
}

function drawMiniPiece(type, cx, cy) {
  const shape = generateShape(type, 0);
  const color = getPieceColor(type);

  const size = BLOCK * 0.7;
  let minX = 99, maxX = -99, minY = 99, maxY = -99;

  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }

  const w = (maxX - minX + 1) * size;
  const h = (maxY - minY + 1) * size;
  const ox = cx - w / 2 - minX * size;
  const oy = cy - h / 2 - minY * size;

  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      drawMiniBlock(ox + x * size, oy + y * size, size, color);
    }
  }
}

// Draw board and HUD (kept behavior identical)
function drawBoard(pState, boardX, boardY, theme) {
  ctx.save();

  ctx.fillStyle = theme.boardBg;
  ctx.fillRect(boardX, boardY, COLS * BLOCK, VISIBLE_ROWS * BLOCK);

  ctx.shadowColor = theme.glowColor;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = theme.glowColor;
  ctx.lineWidth = 3;
  ctx.strokeRect(boardX - 2, boardY - 2, COLS * BLOCK + 4, VISIBLE_ROWS * BLOCK + 4);

  ctx.shadowBlur = 0;
  ctx.strokeStyle = theme.gridColor;
  ctx.lineWidth = 1;

  for (let x = 0; x <= COLS; x++) {
    const gx = boardX + x * BLOCK;
    ctx.beginPath();
    ctx.moveTo(gx, boardY);
    ctx.lineTo(gx, boardY + VISIBLE_ROWS * BLOCK);
    ctx.stroke();
  }

  for (let y = 0; y <= VISIBLE_ROWS; y++) {
    const gy = boardY + y * BLOCK;
    ctx.beginPath();
    ctx.moveTo(boardX, gy);
    ctx.lineTo(boardX + COLS * BLOCK, gy);
    ctx.stroke();
  }

  for (let r = 2; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = pState.board[r][c];
      if (!cell) continue;
      drawBlock(boardX + c * BLOCK, boardY + (r - 2) * BLOCK, cell.color);
    }
  }

  const shape = generateShape(pState.piece, pState.rotation);
  const ghostDy = hardDropDistance(pState);

  ctx.globalAlpha = 0.15;
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      const gx = pState.pieceX + x;
      const gy = pState.pieceY + y + ghostDy;
      if (gy < 2) continue;
      // cheaper ghost: simple filled rect without gradient
      ctx.fillStyle = getPieceColor(pState.piece);
      ctx.fillRect(boardX + gx * BLOCK, boardY + (gy - 2) * BLOCK, BLOCK, BLOCK);
    }
  }
  ctx.globalAlpha = 1;

  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      const px = pState.pieceX + x;
      const py = pState.pieceY + y;
      if (py < 2) continue;
      drawBlock(boardX + px * BLOCK, boardY + (py - 2) * BLOCK, getPieceColor(pState.piece));
    }
  }

  ctx.restore();
}

// Draw next and hold boxes
function drawNext(pState, x, y) {
  ctx.save();
  ctx.fillStyle = currentTheme.holdNextBg;
  const boxH = BLOCK * 10;
  ctx.fillRect(x, y, BLOCK * 4, boxH);

  ctx.shadowColor = currentTheme.glowColor;
  ctx.shadowBlur = 10;
  ctx.strokeStyle = currentTheme.glowColor;
  ctx.strokeRect(x, y, BLOCK * 4, boxH);

  ctx.shadowBlur = 0;
  ctx.fillStyle = currentTheme.hudTextColor;
  ctx.font = "16px Arial";
  ctx.textAlign = "center";
  ctx.fillText("NEXT", x + (BLOCK * 4) / 2, y - 6);

  for (let i = 0; i < 5; i++) {
    const piece = pState.queue[i];
    if (!piece) continue;
    const py = y + 20 + i * (BLOCK * 2.2);
    drawMiniPiece(piece, x + BLOCK * 2, py);
  }
  ctx.restore();
}

function drawHold(pState, x, y) {
  ctx.save();
  ctx.fillStyle = currentTheme.holdNextBg;
  const boxH = BLOCK * 4.5;
  ctx.fillRect(x, y, BLOCK * 4, boxH);

  ctx.shadowColor = currentTheme.glowColor;
  ctx.shadowBlur = 10;
  ctx.strokeStyle = currentTheme.glowColor;
  ctx.strokeRect(x, y, BLOCK * 4, boxH);

  ctx.shadowBlur = 0;
  ctx.fillStyle = currentTheme.hudTextColor;
  ctx.font = "16px Arial";
  ctx.textAlign = "center";
  ctx.fillText("HOLD", x + (BLOCK * 4) / 2, y - 6);

  if (pState.hold) {
    drawMiniPiece(pState.hold, x + BLOCK * 2, y + boxH / 2 + 4);
  }

  ctx.restore();
}

// HUDs
function drawHUDSolo() {
  ctx.save();
  ctx.shadowColor = currentTheme.glowColor;
  ctx.shadowBlur = 10;
  ctx.fillStyle = currentTheme.hudTextColor;
  ctx.font = "18px Arial";
  ctx.textAlign = "left";

  ctx.fillText(`SCORE: ${solo.score}`, 40, 60);
  ctx.fillText(`LINES: ${solo.lines}`, 40, 86);
  ctx.fillText(`LEVEL: ${solo.level}`, 40, 112);

  if (showFPS) {
    ctx.fillText(`FPS: ${fps}`, 40, 138);
  }

  ctx.restore();
}

function drawHUDVS() {
  ctx.save();

  ctx.shadowColor = currentTheme.glowColor;
  ctx.shadowBlur = 12;

  ctx.fillStyle = currentTheme.hudTextColor;
  ctx.font = "18px Arial";
  ctx.textAlign = "center";

  ctx.fillText(`YOU`, VS_PLAYER_BOARD_X + (COLS * BLOCK) / 2, 80);
  ctx.fillText(`BOT`, VS_BOT_BOARD_X + (COLS * BLOCK) / 2, 80);

  ctx.font = "16px Arial";
  ctx.fillText(
    `Score: ${player.score}`,
    VS_PLAYER_BOARD_X + (COLS * BLOCK) / 2,
    VS_BOARD_Y + VISIBLE_ROWS * BLOCK + 40
  );
  ctx.fillText(
    `Score: ${bot.score}`,
    VS_BOT_BOARD_X + (COLS * BLOCK) / 2,
    VS_BOARD_Y + VISIBLE_ROWS * BLOCK + 40
  );

  if (showFPS) {
    ctx.textAlign = "left";
    ctx.fillText(`FPS: ${fps}`, 40, 40);
  }

  ctx.restore();
}

// Menus and screens
function drawMainMenu(time) {
  drawBackgroundGradient();

  const t = time / 1000;
  const theme = currentTheme;

  // Left side: fixed TETRIS+ logo
  const logoX = canvas.width * 0.25;
  const logoY = canvas.height * 0.25;

  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  const pulse = 0.6 + 0.4 * Math.sin(t * 2.2);

  ctx.font = "96px Arial Black";
  ctx.shadowColor = theme.menuLogoShadow;
  ctx.shadowBlur = 32 * pulse;
  ctx.fillStyle = theme.menuLogoColor;
  ctx.fillText("TETRIS+", logoX - 200, logoY);

  ctx.shadowBlur = 0;

  // Right side: vertical buttons
  const labels = [
    "Single Player",
    "Bot Mode",
    "Leaderboards",
    "Controls",
    "Options"
  ];

  const buttonColors = theme.menuButtonColors;
  const baseX = canvas.width * 0.6;
  const baseY = canvas.height * 0.25;
  const btnW = 340;
  const btnH = 52;
  const spacing = 12;

  topRightMenuButtons = [];

  ctx.font = "24px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  labels.forEach((label, i) => {
    const x = baseX;
    const y = baseY + i * (btnH + spacing);
    const isSelected = (i === menuSelection);

    const color = buttonColors[i % buttonColors.length];
    const alpha = isSelected ? 1.0 : 0.7;

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.shadowColor = theme.glowColor;
    ctx.shadowBlur = isSelected ? 24 : 12;

    ctx.fillStyle = color;
    ctx.fillRect(x, y, btnW, btnH);

    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = isSelected ? 3 : 1.5;
    ctx.strokeRect(x, y, btnW, btnH);

    ctx.shadowBlur = 0;

    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, x + 20, y + btnH / 2);

    ctx.restore();

    topRightMenuButtons.push({ x, y, w: btnW, h: btnH, index: i });
  });

  // Bottom banner
  const bannerH = 110;
  const bannerY = canvas.height - bannerH - 40;
  const bannerX = canvas.width * 0.15;
  const bannerW = canvas.width * 0.7;

  ctx.save();
  ctx.fillStyle = theme.menuBannerBg;
  ctx.fillRect(bannerX, bannerY, bannerW, bannerH);

  ctx.strokeStyle = theme.menuBannerAccent;
  ctx.lineWidth = 3;
  ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);

  ctx.fillStyle = "#ffffff";
  ctx.font = "20px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("Also Available!", bannerX + 16, bannerY + 12);

  ctx.font = "24px Arial Bold";
  ctx.fillText("TETRIS+ Modes", bannerX + 16, bannerY + 40);

  ctx.font = "16px Arial";
  ctx.fillText(
    "Challenge the bot or play Solo with advanced themes and undo-powered practice.",
    bannerX + 16,
    bannerY + 68
  );

  ctx.restore();

  // Helper text
  ctx.save();
  ctx.font = "16px Arial";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(
    "UP/DOWN to move, ENTER to select, ESC to quit game",
    canvas.width / 2,
    canvas.height - 12
  );
  ctx.restore();
}

// Leaderboard screen uses the centralized loadLeaderboard function
async function drawLeaderboardScreen(time) {
  drawBackgroundGradient();

  ctx.save();
  ctx.textAlign = "center";
  ctx.shadowColor = currentTheme.glowColor;
  ctx.shadowBlur = 14;

  ctx.fillStyle = currentTheme.hudTextColor;
  ctx.font = "42px Arial Black";
  ctx.fillText("LEADERBOARD", canvas.width / 2, 120);

  ctx.shadowBlur = 0;
  ctx.font = "20px Arial";
  ctx.fillStyle = currentTheme.hudTextColor;
  ctx.fillText("Loading...", canvas.width / 2, 180);

  ctx.restore();

  const entries = await window.loadLeaderboard();

  ctx.save();
  ctx.textAlign = "left";
  ctx.font = "20px Arial";
  ctx.fillStyle = "#fff";

  const startX = canvas.width / 2 - 300;
  let y = 240;

  ctx.font = "22px Arial Black";
  ctx.fillText("Name", startX, y);
  ctx.fillText("Score", startX + 260, y);
  ctx.fillText("Country", startX + 420, y);

  ctx.font = "18px Arial";
  y += 40;

  entries.slice(0, 15).forEach((e) => {
    ctx.fillText(e.name || "Player", startX, y);
    ctx.fillText(e.score || 0, startX + 260, y);
    ctx.fillText(e.country || "N/A", startX + 420, y);
    y += 32;
  });

  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "18px Arial";
  ctx.fillStyle = currentTheme.hudTextColor;
  ctx.fillText("Press ESC to return", canvas.width / 2, canvas.height - 40);
  ctx.restore();
}

// Options screen
function drawOptions(time) {
  drawBackgroundGradient();

  ctx.save();
  ctx.textAlign = "center";

  ctx.shadowColor = currentTheme.glowColor;
  ctx.shadowBlur = 14;
  ctx.fillStyle = currentTheme.hudTextColor;
  ctx.font = "30px Arial";
  ctx.fillText("OPTIONS", canvas.width / 2, 140);

  const rows = [
    `Theme: ${THEMES[currentThemeKey].name}`,
    `Move Speed: ${SPEED_PRESETS[speedPresetIndex].name}`,
    `Volume: ${(masterVolume * 100) | 0}%`,
    `FPS Display: ${showFPS ? "On" : "Off"}`,
    `Background Glow: ${backgroundGlowEnabled ? "On" : "Off"}`
  ];

  ctx.font = "20px Arial";

  rows.forEach((label, i) => {
    const y = 200 + i * 40;
    const selected = (i === optionsSelection);

    ctx.fillStyle = selected
      ? currentTheme.hudTextColor
      : "rgba(255,255,255,0.7)";

    ctx.fillText(label, canvas.width / 2, y);

    if (selected) {
      const glowGrad = ctx.createLinearGradient(
        canvas.width / 2 - 260, 0,
        canvas.width / 2 + 260, 0
      );
      glowGrad.addColorStop(0, currentTheme.glowColor);
      glowGrad.addColorStop(1, "rgba(255,255,255,0.15)");

      ctx.strokeStyle = glowGrad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - 260, y + 8);
      ctx.lineTo(canvas.width / 2 + 260, y + 8);
      ctx.stroke();
    }
  });

  ctx.font = "16px Arial";
  ctx.fillStyle = currentTheme.hudTextColor;
  ctx.shadowBlur = 10;
  ctx.fillText(
    "LEFT/RIGHT to change, UP/DOWN to move, ESC to return",
    canvas.width / 2,
    canvas.height - 40
  );

  ctx.restore();
}

function drawBotDifficultySelect(time) {
  drawBackgroundGradient();

  ctx.save();
  ctx.textAlign = "center";

  const t = time / 1000;

  // Title with glow
  ctx.shadowColor = currentTheme.glowColor;
  ctx.shadowBlur = 20;
  ctx.fillStyle = currentTheme.hudTextColor;
  ctx.font = "bold 48px Arial";
  ctx.fillText("SELECT BOT DIFFICULTY", canvas.width / 2, 100);

  // Subtitle
  ctx.font = "18px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.shadowBlur = 0;
  ctx.fillText("Choose your opponent's skill level", canvas.width / 2, 140);

  const difficulties = [
    { label: "EASY", desc: "Relaxed & Forgiving", difficulty: "👨" },
    { label: "NORMAL", desc: "Balanced Challenge", difficulty: "🤖" },
    { label: "HARD", desc: "Unbeatable AI", difficulty: "⚡" }
  ];

  difficulties.forEach((diff, i) => {
    const x = canvas.width / 2 - 300 + i * 300;
    const y = 300;
    const selected = (i === botDifficultySelection);

    const w = 240;
    const h = 200;

    // Background card with gradient
    ctx.save();
    const gradient = ctx.createLinearGradient(x - w/2, y - h/2, x - w/2, y + h/2);
    
    if (selected) {
      gradient.addColorStop(0, currentTheme.glowColor);
      gradient.addColorStop(0.5, "rgba(100,150,255,0.3)");
      gradient.addColorStop(1, currentTheme.glowColor);
      ctx.shadowBlur = 30;
      ctx.shadowColor = currentTheme.glowColor;
    } else {
      gradient.addColorStop(0, "rgba(255,255,255,0.1)");
      gradient.addColorStop(1, "rgba(255,255,255,0.05)");
      ctx.shadowBlur = 10;
      ctx.shadowColor = "rgba(0,0,0,0.5)";
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(x - w/2, y - h/2, w, h);

    // Border
    ctx.strokeStyle = selected ? currentTheme.hudTextColor : "rgba(255,255,255,0.3)";
    ctx.lineWidth = selected ? 4 : 2;
    ctx.strokeRect(x - w/2, y - h/2, w, h);

    // Pulsing animation for selected
    if (selected) {
      const pulse = 0.8 + 0.2 * Math.sin(t * 3);
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = currentTheme.glowColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(x - w/2 - 5, y - h/2 - 5, w + 10, h + 10);
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // Difficulty icon
    ctx.font = "48px Arial";
    ctx.fillText(diff.difficulty, x, y - 60);

    // Label
    ctx.fillStyle = selected ? currentTheme.hudTextColor : "rgba(255,255,255,0.8)";
    ctx.font = "bold 28px Arial";
    ctx.fillText(diff.label, x, y - 10);

    // Description
    ctx.font = "14px Arial";
    ctx.fillStyle = selected ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.6)";
    ctx.fillText(diff.desc, x, y + 25);

    // Stats bar
    const statsWidth = 180;
    const barY = y + 60;
    const barHeight = 6;
    const fills = [0.4, 0.7, 1.0];
    
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(x - statsWidth/2, barY, statsWidth, barHeight);
    
    ctx.fillStyle = selected ? currentTheme.glowColor : "rgba(100,150,255,0.5)";
    ctx.fillRect(x - statsWidth/2, barY, statsWidth * fills[i], barHeight);
  });

  // Instructions
  ctx.font = "16px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.textAlign = "center";
  ctx.shadowBlur = 5;
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.fillText("← → Arrow Keys to Select | ENTER to Start | ESC to Cancel", canvas.width / 2, canvas.height - 60);

  ctx.restore();
}

function drawControlsMenu(time) {
  drawBackgroundGradient();

  ctx.save();
  ctx.textAlign = "center";

  const t = time / 1000;

  // Title with glow
  ctx.shadowColor = currentTheme.glowColor;
  ctx.shadowBlur = 20;
  ctx.fillStyle = currentTheme.hudTextColor;
  ctx.font = "bold 52px Arial";
  ctx.fillText("CONTROL SETTINGS", canvas.width / 2, 70);

  // Subtitle
  ctx.font = "15px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.shadowBlur = 0;
  ctx.fillText("Select a control and press ENTER to rebind", canvas.width / 2, 105);

  const actionLabels = {
    moveLeft: "← Move Left",
    moveRight: "Move Right →",
    softDrop: "↓ Soft Drop",
    hardDrop: "⬆ Hard Drop",
    rotateCW: "↻ Rotate CW",
    rotateCCW: "↺ Rotate CCW",
    reverseSpin: "⤴ Rotate 180",
    hold: "⊡ Hold Piece",
    pause: "⏸ Pause",
    restart: "↺ Restart",
    undo: "↶ Undo"
  };

  // Group controls by category
  const groups = [
    { title: "MOVEMENT", actions: ["moveLeft", "moveRight", "softDrop", "hardDrop"] },
    { title: "ROTATION", actions: ["rotateCW", "rotateCCW", "reverseSpin"] },
    { title: "UTILITY", actions: ["hold", "pause", "restart", "undo"] }
  ];

  let itemIndex = 0;
  let currentY = 160;

  groups.forEach((group) => {
    // Group title
    ctx.font = "bold 14px Arial";
    ctx.fillStyle = currentTheme.glowColor;
    ctx.textAlign = "left";
    ctx.fillText(group.title, 60, currentY);
    ctx.shadowBlur = 0;

    currentY += 40;

    // Group items in 2-column layout
    const itemsInGroup = group.actions.filter(action => action in actionLabels);
    const rows = Math.ceil(itemsInGroup.length / 2);

    itemsInGroup.forEach((action, idx) => {
      const row = Math.floor(idx / 2);
      const col = idx % 2;

      const x = col === 0 ? 280 : 640;
      const y = currentY + row * 48;

      const selected = (itemIndex === controlsSelection);
      const keyBind = controlsConfig[action] || "?";
      const waitingForThis = (waitingForKeyBinding === action);

      // Background box with rounded appearance
      ctx.save();
      const boxWidth = 300;
      const boxHeight = 42;

      const gradient = ctx.createLinearGradient(x - boxWidth/2, y - boxHeight/2, x - boxWidth/2, y + boxHeight/2);

      if (selected || waitingForThis) {
        gradient.addColorStop(0, currentTheme.glowColor);
        gradient.addColorStop(0.5, "rgba(100,150,255,0.25)");
        gradient.addColorStop(1, currentTheme.glowColor);
        ctx.shadowBlur = 25;
        ctx.shadowColor = currentTheme.glowColor;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      } else {
        gradient.addColorStop(0, "rgba(255,255,255,0.06)");
        gradient.addColorStop(1, "rgba(255,255,255,0.02)");
        ctx.shadowBlur = 6;
        ctx.shadowColor = "rgba(0,0,0,0.4)";
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(x - boxWidth/2, y - boxHeight/2, boxWidth, boxHeight);

      // Border with thickness variation
      ctx.strokeStyle = selected || waitingForThis ? currentTheme.hudTextColor : "rgba(255,255,255,0.2)";
      ctx.lineWidth = selected || waitingForThis ? 2.5 : 1;
      ctx.strokeRect(x - boxWidth/2, y - boxHeight/2, boxWidth, boxHeight);

      // Selection indicator line
      if (selected && !waitingForThis) {
        ctx.strokeStyle = currentTheme.glowColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(x - boxWidth/2 - 2, y - boxHeight/2 - 2, boxWidth + 4, boxHeight + 4);
        ctx.setLineDash([]);
      }

      // Pulsing animation for waiting
      if (waitingForThis) {
        const pulse = 0.65 + 0.35 * Math.sin(t * 4);
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = "#ffff00";
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(x - boxWidth/2 - 4, y - boxHeight/2 - 4, boxWidth + 8, boxHeight + 8);
        ctx.globalAlpha = 1;
        ctx.setLineDash([]);
      }

      ctx.restore();

      // Action label
      ctx.font = selected || waitingForThis ? "bold 15px Arial" : "15px Arial";
      ctx.fillStyle = selected || waitingForThis ? currentTheme.hudTextColor : "rgba(255,255,255,0.7)";
      ctx.textAlign = "left";
      ctx.fillText(actionLabels[action] || action, x - boxWidth/2 + 18, y + 6);

      // Key binding badge
      const badgeWidth = 70;
      ctx.textAlign = "right";

      if (waitingForThis) {
        ctx.fillStyle = "rgba(255,255,0,0.15)";
        ctx.fillRect(x + boxWidth/2 - badgeWidth - 8, y - 14, badgeWidth, 28);

        ctx.fillStyle = "#ffff00";
        ctx.font = "bold 12px Arial";
        ctx.fillText("Press key...", x + boxWidth/2 - 10, y + 6);
      } else {
        ctx.fillStyle = selected ? "rgba(102,255,153,0.1)" : "rgba(150,200,255,0.08)";
        ctx.fillRect(x + boxWidth/2 - badgeWidth - 8, y - 14, badgeWidth, 28);

        ctx.fillStyle = selected ? "#66ff99" : "rgba(150,200,255,0.9)";
        ctx.font = "bold 13px monospace";
        ctx.fillText(keyBind, x + boxWidth/2 - 10, y + 6);
      }

      itemIndex++;
    });

    currentY += rows * 48 + 35;
  });

  // Instructions at bottom
  ctx.font = "13px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.textAlign = "center";
  ctx.shadowBlur = 5;
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.fillText("↑ ↓ Navigate | ENTER Rebind | ESC Back to Menu", canvas.width / 2, canvas.height - 35);

  ctx.restore();
}

// Name entry screen
function drawNameEntry() {
  drawBackgroundGradient();

  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = currentTheme.hudTextColor;

  ctx.font = "42px Arial Black";
  ctx.fillText("ENTER YOUR NAME", canvas.width / 2, 200);

  ctx.font = "28px Arial";
  ctx.fillText(tempName || "_", canvas.width / 2, 280);

  ctx.font = "18px Arial";
  ctx.fillText("Press ENTER to submit", canvas.width / 2, 340);

  ctx.restore();
}

// Expose UI functions
window.drawBackgroundGradient = drawBackgroundGradient;
window.drawBoard = drawBoard;
window.drawNext = drawNext;
window.drawHold = drawHold;
window.drawHUDSolo = drawHUDSolo;
window.drawHUDVS = drawHUDVS;
window.drawMainMenu = drawMainMenu;
window.drawLeaderboardScreen = drawLeaderboardScreen;
window.drawOptions = drawOptions;
window.drawBotDifficultySelect = drawBotDifficultySelect;
window.drawControlsMenu = drawControlsMenu;
window.drawNameEntry = drawNameEntry;
window.drawPopups = drawPopups;
window.drawBlock = drawBlock;
