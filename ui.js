
function drawBackgroundGradient() {
  const [c1, c2] = currentTheme.backgroundGradient;
  const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Helper: draw rounded rect
function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  if (typeof r === 'undefined') r = 6;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

// Helper: wrap text into lines and draw
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line.trim(), x, y);
}

// convert hex color to rgba string with alpha
function hexToRgba(hex, alpha) {
  if (!hex) return `rgba(255,255,255,${alpha})`;
  const h = hex.replace('#', '');
  const bigint = parseInt(h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
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
    ctx.save();

    // modern rounded button
    ctx.shadowColor = isSelected ? theme.glowColor : 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = isSelected ? 28 : 8;
    const grad = ctx.createLinearGradient(x, y, x + btnW, y + btnH);
    grad.addColorStop(0, hexToRgba(color, isSelected ? 0.95 : 0.85));
    grad.addColorStop(1, hexToRgba(color, isSelected ? 0.82 : 0.7));
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, btnW, btnH, 12, true, false);

    ctx.fillStyle = '#fff';
    ctx.font = isSelected ? '20px Arial Black' : '18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 26, y + btnH / 2 + (isSelected ? 2 : 0));

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

  const t = time / 1000;
  const entries = leaderboardData || [];

  // TITLE
  ctx.save();
  ctx.textAlign = "center";
  ctx.shadowColor = currentTheme.glowColor;
  ctx.shadowBlur = 20;
  ctx.fillStyle = currentTheme.hudTextColor;
  ctx.font = "52px Arial Black";
  ctx.fillText("LEADERBOARD", canvas.width / 2, 90);
  ctx.restore();

  // CONTAINER & ENTRIES
  const containerX = canvas.width / 2 - 420;
  const containerY = 150;
  const containerW = 840;
  const containerH = Math.min(entries.length * 56 + 80, 600);

  // Modern container background
  ctx.save();
  ctx.shadowColor = currentTheme.glowColor;
  ctx.shadowBlur = 25;
  const containerGrad = ctx.createLinearGradient(containerX, containerY, containerX, containerY + containerH);
  containerGrad.addColorStop(0, "rgba(100,150,255,0.08)");
  containerGrad.addColorStop(0.5, "rgba(100,150,255,0.03)");
  containerGrad.addColorStop(1, "rgba(100,150,255,0.08)");
  ctx.fillStyle = containerGrad;
  roundRect(ctx, containerX, containerY, containerW, containerH, 16, true, false);

  // Border
  ctx.strokeStyle = currentTheme.glowColor;
  ctx.lineWidth = 2;
  roundRect(ctx, containerX, containerY, containerW, containerH, 16, false, true);
  ctx.restore();

  // HEADER ROW
  ctx.save();
  const headerY = containerY + 25;
  ctx.font = "bold 16px Arial";
  ctx.fillStyle = currentTheme.glowColor;
  ctx.textAlign = "left";
  ctx.fillText("#", containerX + 20, headerY);
  ctx.fillText("NAME", containerX + 70, headerY);
  ctx.fillText("SCORE", containerX + 460, headerY);
  ctx.fillText("COUNTRY", containerX + 650, headerY);
  ctx.restore();

  // Separator line
  ctx.save();
  ctx.strokeStyle = `rgba(${currentTheme.glowColor ? currentTheme.glowColor : '#fff'},0.2)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(containerX + 15, headerY + 8);
  ctx.lineTo(containerX + containerW - 15, headerY + 8);
  ctx.stroke();
  ctx.restore();

  // ENTRIES
  ctx.save();
  let entryY = headerY + 32;
  entries.slice(0, 15).forEach((e, idx) => {
    const rank = idx + 1;
    const isMedal = rank <= 3;
    
    // Row background with gradient
    if (idx % 2 === 0) {
      const rowGrad = ctx.createLinearGradient(containerX + 10, entryY - 20, containerX + 10, entryY + 20);
      rowGrad.addColorStop(0, "rgba(255,255,255,0.02)");
      rowGrad.addColorStop(1, "rgba(255,255,255,0.00)");
      ctx.fillStyle = rowGrad;
      ctx.fillRect(containerX + 10, entryY - 22, containerW - 20, 48);
    }

    // Glow for top 3
    if (isMedal) {
      const medalColors = ["#FFD700", "#C0C0C0", "#CD7F32"];
      ctx.shadowColor = medalColors[rank - 1];
      ctx.shadowBlur = 12;
    } else {
      ctx.shadowColor = "transparent";
    }

    // RANK BADGE
    const rankBadgeX = containerX + 35;
    const rankBadgeRadius = 14;
    
    if (isMedal) {
      const medalColors = ["#FFD700", "#C0C0C0", "#CD7F32"];
      const medalBg = ["rgba(255,215,0,0.15)", "rgba(192,192,192,0.15)", "rgba(205,127,50,0.15)"];
      ctx.fillStyle = medalBg[rank - 1];
      ctx.beginPath();
      ctx.arc(rankBadgeX, entryY, rankBadgeRadius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = medalColors[rank - 1];
      ctx.font = "bold 18px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const medals = ["🥇", "🥈", "🥉"];
      ctx.fillText(medals[rank - 1], rankBadgeX, entryY + 1);
    } else {
      ctx.fillStyle = "rgba(100,150,255,0.3)";
      ctx.beginPath();
      ctx.arc(rankBadgeX, entryY, rankBadgeRadius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = "rgba(100,150,255,0.5)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(rank, rankBadgeX, entryY);
    }

    // NAME
    ctx.fillStyle = isMedal ? "#FFD700" : "#ffffff";
    ctx.font = isMedal ? "bold 18px Arial" : "18px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText((e.name || "Player").substring(0, 20), containerX + 70, entryY);

    // SCORE - right aligned
    ctx.fillStyle = isMedal ? "#FFD700" : "rgba(150,200,255,0.95)";
    ctx.font = isMedal ? "bold 20px Arial Black" : "bold 18px Arial";
    ctx.textAlign = "right";
    ctx.fillText((e.score || 0).toLocaleString(), containerX + 550, entryY);

    // COUNTRY
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "14px Arial";
    ctx.textAlign = "left";
    ctx.fillText(e.country || "N/A", containerX + 650, entryY);

    entryY += 56;
  });

  ctx.restore();

  // FOOTER TEXT
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "16px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 5;
  ctx.fillText("↑ ↓ Navigate | ESC to Return", canvas.width / 2, canvas.height - 50);
  ctx.restore();
}

// Options screen
function drawOptions(time) {
  drawBackgroundGradient();

  const t = time / 1000;

  ctx.save();
  ctx.textAlign = "center";

  ctx.shadowColor = currentTheme.glowColor;
  ctx.shadowBlur = 20;
  ctx.fillStyle = currentTheme.hudTextColor;
  ctx.font = "52px Arial Black";
  ctx.fillText("OPTIONS", canvas.width / 2, 90);

  const rows = [
    `Theme: ${THEMES[currentThemeKey].name}`,
    `Move Speed: ${SPEED_PRESETS[speedPresetIndex].name}`,
    `Custom DAS: ${window.CUSTOM_DAS !== null && window.CUSTOM_DAS !== undefined ? window.CUSTOM_DAS + ' ms' : 'Off'}`,
    `Custom ARR: ${window.CUSTOM_ARR !== null && window.CUSTOM_ARR !== undefined ? window.CUSTOM_ARR + ' ms' : 'Off'}`,
    `Volume: ${(masterVolume * 100) | 0}%`,
    `FPS Display: ${showFPS ? "On" : "Off"}`,
    `Background Glow: ${backgroundGlowEnabled ? "On" : "Off"}`
  ];

  // Container
  const containerX = canvas.width / 2 - 380;
  const containerY = 160;
  const containerW = 760;
  const optionH = 56;
  const containerH = rows.length * optionH + 40;

  // Modern container background
  ctx.shadowColor = currentTheme.glowColor;
  ctx.shadowBlur = 25;
  const containerGrad = ctx.createLinearGradient(containerX, containerY, containerX, containerY + containerH);
  containerGrad.addColorStop(0, "rgba(100,150,255,0.08)");
  containerGrad.addColorStop(0.5, "rgba(100,150,255,0.03)");
  containerGrad.addColorStop(1, "rgba(100,150,255,0.08)");
  ctx.fillStyle = containerGrad;
  roundRect(ctx, containerX, containerY, containerW, containerH, 16, true, false);

  // Border
  ctx.strokeStyle = currentTheme.glowColor;
  ctx.lineWidth = 2;
  roundRect(ctx, containerX, containerY, containerW, containerH, 16, false, true);
  ctx.restore();

  // Options
  ctx.save();
  rows.forEach((label, i) => {
    const y = containerY + 30 + i * optionH;
    const selected = (i === optionsSelection);

    // Row background
    if (selected) {
      const rowGrad = ctx.createLinearGradient(containerX + 10, y - 24, containerX + 10, y + 24);
      rowGrad.addColorStop(0, "rgba(100,150,255,0.12)");
      rowGrad.addColorStop(1, "rgba(100,150,255,0.03)");
      ctx.fillStyle = rowGrad;
      ctx.fillRect(containerX + 10, y - 24, containerW - 20, optionH);

      // Selection border
      ctx.strokeStyle = currentTheme.glowColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(containerX + 10, y - 24, containerW - 20, optionH);
    } else if (i % 2 === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.02)";
      ctx.fillRect(containerX + 10, y - 24, containerW - 20, optionH);
    }

    // Label
    ctx.fillStyle = selected ? currentTheme.hudTextColor : "rgba(255,255,255,0.85)";
    ctx.font = selected ? "bold 18px Arial" : "18px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, containerX + 40, y + 2);

    // Arrow indicator for selected
    if (selected) {
      ctx.fillStyle = currentTheme.glowColor;
      ctx.font = "bold 20px Arial";
      ctx.textAlign = "right";
      ctx.fillText("◄ ►", containerX + containerW - 40, y + 2);
    }
  });

  ctx.restore();

  // expose option count so main.js can use it for navigation
  window.getOptionsCount = () => rows.length;

  // Instructions
  ctx.save();
  ctx.font = "14px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 5;
  ctx.fillText("← → to change | ↑ ↓ to navigate | ESC to return", canvas.width / 2, canvas.height - 50);
  ctx.restore();
}

function drawBotDifficultySelect(time) {
  drawBackgroundGradient();

  const t = time / 1000;

  // TITLE
  ctx.save();
  ctx.textAlign = "center";
  ctx.shadowColor = currentTheme.glowColor;
  ctx.shadowBlur = 20;
  ctx.fillStyle = currentTheme.hudTextColor;
  ctx.font = "52px Arial Black";
  ctx.fillText("SELECT BOT DIFFICULTY", canvas.width / 2, 90);

  ctx.font = "14px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.shadowBlur = 0;
  ctx.fillText("Choose your opponent's skill level", canvas.width / 2, 125);
  ctx.restore();

  const difficulties = [
    { label: "EASY", desc: "Relaxed opponent", level: 1, color: "#66FF99" },
    { label: "NORMAL", desc: "Balanced challenge", level: 2, color: "#FFD700" },
    { label: "HARD", desc: "Expert difficulty", level: 3, color: "#FF6B6B" }
  ];

  difficulties.forEach((diff, i) => {
    const x = canvas.width / 2 - 320 + i * 320;
    const y = 320;
    const selected = (i === botDifficultySelection);

    const cardW = 240;
    const cardH = 260;

    // Card background with gradient
    ctx.save();
    ctx.shadowColor = selected ? currentTheme.glowColor : "rgba(0,0,0,0.4)";
    ctx.shadowBlur = selected ? 30 : 12;

    const cardGrad = ctx.createLinearGradient(x - cardW/2, y - cardH/2, x - cardW/2, y + cardH/2);
    
    if (selected) {
      cardGrad.addColorStop(0, "rgba(100,150,255,0.12)");
      cardGrad.addColorStop(0.5, "rgba(100,150,255,0.05)");
      cardGrad.addColorStop(1, "rgba(100,150,255,0.12)");
    } else {
      cardGrad.addColorStop(0, "rgba(255,255,255,0.04)");
      cardGrad.addColorStop(1, "rgba(255,255,255,0.01)");
    }

    ctx.fillStyle = cardGrad;
    roundRect(ctx, x - cardW/2, y - cardH/2, cardW, cardH, 14, true, false);

    // Border
    ctx.strokeStyle = selected ? currentTheme.glowColor : "rgba(255,255,255,0.15)";
    ctx.lineWidth = selected ? 2.5 : 1.5;
    roundRect(ctx, x - cardW/2, y - cardH/2, cardW, cardH, 14, false, true);

    // Pulsing glow for selected
    if (selected) {
      const pulse = 0.7 + 0.3 * Math.sin(t * 3);
      ctx.globalAlpha = pulse * 0.5;
      ctx.strokeStyle = currentTheme.glowColor;
      ctx.lineWidth = 1;
      roundRect(ctx, x - cardW/2 - 6, y - cardH/2 - 6, cardW + 12, cardH + 12, 16, false, true);
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // DIFFICULTY ICON (modern design instead of emoji)
    ctx.save();
    const iconY = y - 80;
    const iconSize = 50;
    
    // Icon background circle
    ctx.fillStyle = `rgba(${diff.color.slice(1).match(/.{1,2}/g).map(x => parseInt(x, 16)).join(',')},0.15)`;
    ctx.beginPath();
    ctx.arc(x, iconY, iconSize, 0, Math.PI * 2);
    ctx.fill();

    // Icon border
    ctx.strokeStyle = diff.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw icon based on difficulty
    ctx.fillStyle = diff.color;
    ctx.strokeStyle = diff.color;
    ctx.lineWidth = 2;

    if (i === 0) {
      // EASY: Simple smiley face
      ctx.beginPath();
      ctx.arc(x, iconY, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = diff.color;
      ctx.beginPath();
      ctx.arc(x - 7, iconY - 4, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 7, iconY - 4, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, iconY + 6, 1.5, 0, Math.PI);
      ctx.stroke();
    } else if (i === 1) {
      // NORMAL: Shield with checkmark
      ctx.beginPath();
      ctx.moveTo(x - 12, iconY - 18);
      ctx.lineTo(x + 12, iconY - 18);
      ctx.lineTo(x + 12, iconY + 2);
      ctx.quadraticCurveTo(x, iconY + 14, x - 12, iconY + 2);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 4, iconY + 2);
      ctx.lineTo(x + 2, iconY + 6);
      ctx.lineTo(x + 8, iconY - 4);
      ctx.stroke();
    } else {
      // HARD: Lightning bolt
      ctx.beginPath();
      ctx.moveTo(x, iconY - 18);
      ctx.lineTo(x - 8, iconY - 2);
      ctx.lineTo(x - 2, iconY);
      ctx.lineTo(x + 2, iconY + 18);
      ctx.lineTo(x - 4, iconY + 6);
      ctx.lineTo(x - 10, iconY + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();

    // LABEL
    ctx.fillStyle = selected ? currentTheme.hudTextColor : "rgba(255,255,255,0.9)";
    ctx.font = selected ? "bold 26px Arial" : "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(diff.label, x, y + 30);

    // DESCRIPTION
    ctx.fillStyle = selected ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.7)";
    ctx.font = "13px Arial";
    ctx.fillText(diff.desc, x, y + 60);

    // DIFFICULTY GAUGE
    const gaugeY = y + 95;
    const gaugeW = 180;
    const gaugeH = 6;
    const fill = [0.35, 0.65, 1.0][i];

    ctx.fillStyle = "rgba(255,255,255,0.1)";
    roundRect(ctx, x - gaugeW/2, gaugeY, gaugeW, gaugeH, 3, true, false);

    ctx.fillStyle = diff.color;
    roundRect(ctx, x - gaugeW/2, gaugeY, gaugeW * fill, gaugeH, 3, true, false);

    // STATS TEXT
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "11px Arial";
    ctx.textAlign = "center";
    const difficultyText = ["Beginner", "Intermediate", "Expert"][i];
    ctx.fillText(difficultyText, x, gaugeY + 22);

    // SELECTED BADGE
    if (selected) {
      ctx.save();
      ctx.fillStyle = "rgba(100,150,255,0.12)";
      roundRect(ctx, x - 50, y + 120, 100, 24, 6, true, false);
      ctx.fillStyle = currentTheme.glowColor;
      ctx.font = "bold 11px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("SELECTED", x, y + 132);
      ctx.restore();
    }
  });

  // INSTRUCTIONS
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "13px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 5;
  ctx.fillText("← → to select | ENTER to start | ESC to cancel", canvas.width / 2, canvas.height - 50);
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
  ctx.font = "14px Arial";
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
  let currentY = 155;

  groups.forEach((group, groupIdx) => {
    // Container for group
    const itemsInGroup = group.actions.filter(action => action in actionLabels);
    const rows = Math.ceil(itemsInGroup.length / 2);
    const groupContainerH = rows * 56 + 45;
    
    const groupX = canvas.width / 2 - 500;
    const groupY = currentY - 15;
    const groupW = 1000;

    // Group container background
    ctx.save();
    ctx.shadowColor = currentTheme.glowColor;
    ctx.shadowBlur = 15;
    const groupGrad = ctx.createLinearGradient(groupX, groupY, groupX, groupY + groupContainerH);
    groupGrad.addColorStop(0, "rgba(100,150,255,0.05)");
    groupGrad.addColorStop(1, "rgba(100,150,255,0.02)");
    ctx.fillStyle = groupGrad;
    roundRect(ctx, groupX, groupY, groupW, groupContainerH, 12, true, false);

    // Border
    ctx.strokeStyle = "rgba(100,150,255,0.3)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, groupX, groupY, groupW, groupContainerH, 12, false, true);
    ctx.restore();

    // Group title
    ctx.save();
    ctx.font = "bold 13px Arial";
    ctx.fillStyle = currentTheme.glowColor;
    ctx.textAlign = "left";
    ctx.fillText(group.title, groupX + 24, groupY + 28);
    ctx.restore();

    currentY += 45;

    // Group items in 2-column layout
    itemsInGroup.forEach((action, idx) => {
      const row = Math.floor(idx / 2);
      const col = idx % 2;

      const x = groupX + 50 + col * 500;
      const y = currentY + row * 56;

      const selected = (itemIndex === controlsSelection);
      const keyBind = controlsConfig[action] || "?";
      const waitingForThis = (waitingForKeyBinding === action);

      // Background box with rounded appearance
      ctx.save();
      const boxWidth = 420;
      const boxHeight = 48;

      const gradient = ctx.createLinearGradient(x, y - boxHeight/2, x, y + boxHeight/2);

      if (selected || waitingForThis) {
        gradient.addColorStop(0, "rgba(100,150,255,0.3)");
        gradient.addColorStop(0.5, "rgba(100,150,255,0.15)");
        gradient.addColorStop(1, "rgba(100,150,255,0.3)");
        ctx.shadowBlur = 20;
        ctx.shadowColor = currentTheme.glowColor;
      } else {
        gradient.addColorStop(0, "rgba(255,255,255,0.05)");
        gradient.addColorStop(1, "rgba(255,255,255,0.01)");
        ctx.shadowBlur = 5;
        ctx.shadowColor = "rgba(0,0,0,0.2)";
      }

      ctx.fillStyle = gradient;
      roundRect(ctx, x, y - boxHeight/2, boxWidth, boxHeight, 8, true, false);

      // Border
      ctx.strokeStyle = selected || waitingForThis ? currentTheme.hudTextColor : "rgba(255,255,255,0.15)";
      ctx.lineWidth = selected || waitingForThis ? 2 : 1;
      roundRect(ctx, x, y - boxHeight/2, boxWidth, boxHeight, 8, false, true);

      // Pulsing animation for waiting
      if (waitingForThis) {
        const pulse = 0.65 + 0.35 * Math.sin(t * 4);
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = "#ffff00";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + 20, y, 16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      ctx.restore();

      // Action label
      ctx.font = selected || waitingForThis ? "bold 14px Arial" : "14px Arial";
      ctx.fillStyle = selected || waitingForThis ? currentTheme.hudTextColor : "rgba(255,255,255,0.8)";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(actionLabels[action] || action, x + 20, y);

      // Key binding badge
      ctx.save();
      const badgeWidth = 80;
      const badgeHeight = 28;
      const badgeX = x + boxWidth - badgeWidth - 10;
      const badgeY = y - badgeHeight/2;

      if (waitingForThis) {
        ctx.fillStyle = "rgba(255,255,0,0.1)";
        roundRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 6, true, false);
        ctx.fillStyle = "#ffff00";
        ctx.font = "bold 10px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Press key", badgeX + badgeWidth/2, y);
      } else {
        ctx.fillStyle = selected ? "rgba(102,255,153,0.1)" : "rgba(150,200,255,0.08)";
        roundRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 6, true, false);
        ctx.fillStyle = selected ? "#66ff99" : "rgba(150,200,255,0.85)";
        ctx.font = "bold 12px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(keyBind, badgeX + badgeWidth/2, y);
      }
      ctx.restore();

      itemIndex++;
    });

    currentY += rows * 56 + 20;
  });

  // Instructions at bottom
  ctx.save();
  ctx.font = "13px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.textAlign = "center";
  ctx.shadowBlur = 5;
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.fillText("↑ ↓ Navigate | ENTER Rebind | ESC Back", canvas.width / 2, canvas.height - 40);
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

  // Show brief on-screen validation if name was empty on submit
  const invalidUntil = window.nameEntryInvalidUntil || 0;
  if (Date.now() < invalidUntil) {
    const t = Date.now();
    const alpha = 0.6 + 0.4 * Math.abs(Math.sin((t % 400) / 400 * Math.PI * 2));
    ctx.fillStyle = `rgba(255,80,80,${alpha.toFixed(3)})`;
    ctx.font = "16px Arial";
    ctx.fillText("Please enter a name", canvas.width / 2, 320);
    // draw a subtle red underline under the name
    ctx.strokeStyle = `rgba(255,80,80,${alpha.toFixed(3)})`;
    ctx.lineWidth = 2;
    const textWidth = ctx.measureText(tempName || "_").width;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - textWidth / 2 - 6, 288);
    ctx.lineTo(canvas.width / 2 + textWidth / 2 + 6, 288);
    ctx.stroke();
    ctx.fillStyle = currentTheme.hudTextColor;
  }

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
// Solo type selection screen: Competitive or Casual
function drawSoloTypeSelect() {
  drawBackgroundGradient();
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = currentTheme.hudTextColor;

  ctx.font = "42px Arial Black";
  ctx.fillText("SELECT SOLO MODE", canvas.width / 2, 160);

  // Draw option cards centered
  const cardW = Math.min(520, Math.floor(canvas.width * 0.28));
  const cardH = Math.min(160, Math.floor(canvas.height * 0.18));
  const gap = 40;
  const totalW = cardW * 2 + gap;
  const startX = Math.round((canvas.width - totalW) / 2);
  const startY = Math.round(canvas.height / 2 - cardH / 2 + 20);
  const options = [
    {
      title: "Competitive",
      desc: "No undo/redo — score uploads to leaderboard",
      color: "#FF6B6B"
    },
    {
      title: "Casual",
      desc: "Undo/redo allowed — does NOT upload score",
      color: "#66CCFF"
    }
  ];

  for (let i = 0; i < options.length; i++) {
    const x = startX + i * (cardW + gap);
    const y = startY;
    const opt = options[i];
    const selected = (window.soloTypeSelection || 0) === i;

    // pulsing glow for selected
    const now = performance.now();
    const pulse = 0.8 + 0.2 * Math.sin(now * 0.006 + i);

    // card background gradient
    const g = ctx.createLinearGradient(x, y, x + cardW, y + cardH);
    if (selected) {
      g.addColorStop(0, hexToRgba(opt.color, 0.14 * pulse));
      g.addColorStop(1, hexToRgba(opt.color, 0.04 * pulse));
    } else {
      g.addColorStop(0, 'rgba(255,255,255,0.02)');
      g.addColorStop(1, 'rgba(0,0,0,0.02)');
    }

    ctx.save();
    ctx.shadowColor = selected ? opt.color : 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = selected ? 30 * pulse : 10;
    ctx.fillStyle = g;
    roundRect(ctx, x, y, cardW, cardH, 14, true, false);

    // small icon box
    const iconX = x + 18;
    const iconY = y + 18;
    const iconSize = 56;
    ctx.fillStyle = hexToRgba(opt.color, 0.95);
    roundRect(ctx, iconX, iconY, iconSize, iconSize, 10, true, false);
    // draw mini piece as icon (competitive = red square, casual = blue rounded)
    ctx.save();
    ctx.translate(iconX + iconSize / 2, iconY + iconSize / 2);
    if (i === 0) {
      // competitive: draw 'TT' symbol
      ctx.fillStyle = '#fff';
      ctx.font = '24px Arial Black';
      ctx.textAlign = 'center';
      ctx.fillText('CP', 0, 8);
    } else {
      ctx.fillStyle = '#fff';
      ctx.font = '20px Arial Black';
      ctx.textAlign = 'center';
      ctx.fillText('CS', 0, 8);
    }
    ctx.restore();

    // title & desc
    ctx.fillStyle = selected ? '#ffffff' : 'rgba(255,255,255,0.95)';
    ctx.font = '24px Arial Black';
    ctx.textAlign = 'left';
    ctx.fillText(opt.title, x + 24 + iconSize + 12, y + 46);

    ctx.font = '14px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    wrapText(ctx, opt.desc, x + 24 + iconSize + 12, y + 74, cardW - (24 + iconSize + 36), 18);

    // selected badge
    if (selected) {
      ctx.fillStyle = hexToRgba('#ffffff', 0.06);
      roundRect(ctx, x + cardW - 110, y + 18, 86, 36, 10, true, false);
      ctx.fillStyle = '#fff';
      ctx.font = '13px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('SELECTED', x + cardW - 66, y + 41);
    }

    ctx.restore();
  }

  // Helper text
  ctx.textAlign = "center";
  ctx.font = "16px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText("Use ←/→ to choose, ENTER to confirm — Competitive uploads score", canvas.width / 2, canvas.height - 72);

  ctx.restore();
}

window.drawSoloTypeSelect = drawSoloTypeSelect;
