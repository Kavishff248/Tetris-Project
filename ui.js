
const UI_FONT = '"Segoe UI", "Inter", "SF Pro Text", system-ui, sans-serif';
const UI_FONT_HEAVY = '"Segoe UI Black", "Arial Black", sans-serif';

function drawBackgroundGradient() {
  const [c1, c2] = currentTheme.backgroundGradient;
  const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const glow = ctx.createRadialGradient(
    canvas.width * 0.15,
    canvas.height * 0.2,
    40,
    canvas.width * 0.15,
    canvas.height * 0.2,
    canvas.width * 0.9
  );
  glow.addColorStop(0, "rgba(120, 200, 255, 0.14)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle scanline effect for a cleaner "game client" look.
  ctx.fillStyle = "rgba(255,255,255,0.015)";
  for (let y = 0; y < canvas.height; y += 4) {
    ctx.fillRect(0, y, canvas.width, 1);
  }
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

function drawGlassPanel(x, y, w, h, radius = 14, accent = currentTheme.glowColor) {
  const panelGrad = ctx.createLinearGradient(x, y, x, y + h);
  panelGrad.addColorStop(0, "rgba(255,255,255,0.09)");
  panelGrad.addColorStop(1, "rgba(0,0,0,0.28)");
  ctx.fillStyle = panelGrad;
  roundRect(ctx, x, y, w, h, radius, true, false);

  ctx.strokeStyle = hexToRgba(accent, 0.75);
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, radius, false, true);

  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  roundRect(ctx, x + 1, y + 1, w - 2, h - 2, Math.max(4, radius - 2), false, true);
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

  drawGlassPanel(boardX - 6, boardY - 6, COLS * BLOCK + 12, VISIBLE_ROWS * BLOCK + 12, 10, theme.glowColor);
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

  // Incoming garbage meter (stylized side rail).
  const meterX = boardX + COLS * BLOCK + 8;
  const meterY = boardY;
  const meterW = 10;
  const meterH = VISIBLE_ROWS * BLOCK;
  const incoming = Math.max(0, pState.garbageQueue || 0);
  const cappedRows = Math.min(VISIBLE_ROWS, incoming);
  const fillH = Math.round((cappedRows / VISIBLE_ROWS) * meterH);
  const flash = (pState.garbageFlashUntil && performance.now() < pState.garbageFlashUntil);

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  roundRect(ctx, meterX, meterY, meterW, meterH, 5, true, false);
  if (fillH > 0) {
    const grad = ctx.createLinearGradient(meterX, meterY + meterH, meterX, meterY + meterH - fillH);
    grad.addColorStop(0, flash ? "rgba(255,70,70,0.95)" : "rgba(255,120,60,0.85)");
    grad.addColorStop(1, flash ? "rgba(255,200,80,0.95)" : "rgba(255,190,90,0.9)");
    ctx.fillStyle = grad;
    roundRect(ctx, meterX, meterY + meterH - fillH, meterW, fillH, 5, true, false);
  }
  ctx.strokeStyle = flash ? "rgba(255,200,120,0.95)" : "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, meterX, meterY, meterW, meterH, 5, false, true);

  if (incoming > 0) {
    ctx.fillStyle = flash ? "#ffd082" : "rgba(255,255,255,0.85)";
    ctx.font = `700 12px ${UI_FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(`${incoming}`, meterX + meterW / 2, meterY - 6);
  }

  ctx.restore();
}

// Draw next and hold boxes
function drawNext(pState, x, y) {
  ctx.save();
  const boxH = BLOCK * 10;
  drawGlassPanel(x, y, BLOCK * 4, boxH, 10);

  ctx.shadowBlur = 0;
  ctx.fillStyle = currentTheme.hudTextColor;
  ctx.font = `700 15px ${UI_FONT}`;
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
  const boxH = BLOCK * 4.5;
  drawGlassPanel(x, y, BLOCK * 4, boxH, 10);

  ctx.shadowBlur = 0;
  ctx.fillStyle = currentTheme.hudTextColor;
  ctx.font = `700 15px ${UI_FONT}`;
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
  ctx.font = `600 18px ${UI_FONT}`;
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
  ctx.font = `700 18px ${UI_FONT}`;
  ctx.textAlign = "center";

  ctx.fillText(`YOU`, VS_PLAYER_BOARD_X + (COLS * BLOCK) / 2, 80);
  ctx.fillText(`BOT`, VS_BOT_BOARD_X + (COLS * BLOCK) / 2, 80);

  ctx.font = `600 16px ${UI_FONT}`;
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
  const pulse = 0.7 + 0.3 * Math.sin(t * 2);
  const leftX = 130;
  const leftY = 170;
  const panelX = canvas.width - 530;
  const panelY = 120;
  const panelW = 410;
  const panelH = 520;

  const labels = [
    "Single Player",
    "Bot Mode",
    "Online 1v1",
    "Leaderboards",
    "1v1 Arena",
    "Controls",
    "Options"
  ];

  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.shadowColor = theme.menuLogoShadow;
  ctx.shadowBlur = 26 * pulse;
  ctx.fillStyle = theme.menuLogoColor;
  ctx.font = `900 90px ${UI_FONT_HEAVY}`;
  ctx.fillText("TETRIS+", leftX, leftY);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(225,242,255,0.86)";
  ctx.font = `600 22px ${UI_FONT}`;
  ctx.fillText("Clean stack. Fast queue. Global arena.", leftX + 2, leftY + 104);
  ctx.font = `500 15px ${UI_FONT}`;
  ctx.fillStyle = "rgba(215,235,255,0.72)";
  ctx.fillText("UP/DOWN + ENTER or mouse click", leftX + 2, leftY + 142);
  ctx.restore();

  ctx.save();
  drawGlassPanel(panelX, panelY, panelW, panelH, 18, theme.menuBannerAccent);
  ctx.fillStyle = "rgba(230,245,255,0.9)";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = `700 18px ${UI_FONT}`;
  ctx.fillText("MAIN MENU", panelX + 24, panelY + 18);
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(panelX + 20, panelY + 52);
  ctx.lineTo(panelX + panelW - 20, panelY + 52);
  ctx.stroke();
  ctx.restore();

  topRightMenuButtons = [];
  const rowX = panelX + 20;
  const rowW = panelW - 40;
  const rowH = 54;
  const rowGap = 10;
  const firstY = panelY + 66;
  const buttonColors = theme.menuButtonColors;

  labels.forEach((label, i) => {
    const y = firstY + i * (rowH + rowGap);
    const isSelected = (i === menuSelection);
    const color = buttonColors[i % buttonColors.length];

    ctx.save();
    const rowGrad = ctx.createLinearGradient(rowX, y, rowX + rowW, y + rowH);
    if (isSelected) {
      rowGrad.addColorStop(0, hexToRgba(color, 0.34));
      rowGrad.addColorStop(1, hexToRgba(color, 0.2));
      ctx.shadowColor = hexToRgba(color, 0.8);
      ctx.shadowBlur = 14;
    } else {
      rowGrad.addColorStop(0, "rgba(255,255,255,0.06)");
      rowGrad.addColorStop(1, "rgba(255,255,255,0.02)");
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle = rowGrad;
    roundRect(ctx, rowX, y, rowW, rowH, 11, true, false);

    ctx.strokeStyle = isSelected ? hexToRgba(color, 0.85) : "rgba(170,205,245,0.25)";
    ctx.lineWidth = isSelected ? 1.8 : 1;
    roundRect(ctx, rowX, y, rowW, rowH, 11, false, true);

    if (isSelected) {
      ctx.fillStyle = "rgba(235,248,255,0.95)";
      ctx.fillRect(rowX + 12, y + 10, 4, rowH - 20);
    }

    ctx.fillStyle = "#f2f9ff";
    ctx.font = isSelected ? `700 19px ${UI_FONT}` : `600 17px ${UI_FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, rowX + 28, y + rowH / 2 + 1);
    ctx.restore();

    topRightMenuButtons.push({ x: rowX, y, w: rowW, h: rowH, index: i });
  });
}

function drawOnlineArenaScreen(time) {
  drawBackgroundGradient();
  onlineArenaQueueButtonBounds = null;
  onlineArenaBackButtonBounds = null;

  const online = window.online1v1 ? window.online1v1.getState() : null;
  const status = online ? online.status : "Online module not loaded";
  const queueing = !!(online && online.queueing);
  const matched = !!(online && online.matched);

  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = "#f3fbff";
  ctx.shadowColor = hexToRgba(currentTheme.glowColor, 0.8);
  ctx.shadowBlur = 24;
  ctx.font = `900 52px ${UI_FONT_HEAVY}`;
  ctx.fillText("ONLINE 1V1", canvas.width / 2, 90);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(220,240,255,0.78)";
  ctx.font = `600 14px ${UI_FONT}`;
  ctx.fillText("Realtime queue and matchmaking (MVP scaffold)", canvas.width / 2, 116);
  ctx.restore();

  const panelX = canvas.width / 2 - 420;
  const panelY = 150;
  const panelW = 840;
  const panelH = 420;

  drawGlassPanel(panelX, panelY, panelW, panelH, 16, currentTheme.glowColor);

  ctx.save();
  ctx.textAlign = "left";
  ctx.fillStyle = "#eaf7ff";
  ctx.font = `700 20px ${UI_FONT}`;
  ctx.fillText("Connection", panelX + 30, panelY + 56);

  ctx.font = `600 16px ${UI_FONT}`;
  ctx.fillStyle = "rgba(230,245,255,0.9)";
  ctx.fillText(`Status: ${status}`, panelX + 30, panelY + 92);
  ctx.fillText(`Server: ${(online && online.serverUrl) || "ws://localhost:8080"}`, panelX + 30, panelY + 124);
  ctx.fillText(`Region: ${(online && online.region) || "global"}`, panelX + 30, panelY + 156);
  if (online && online.opponent) {
    ctx.fillText(`Opponent: ${online.opponent.name || "Unknown"}`, panelX + 30, panelY + 188);
  }
  if (online && online.roomId) {
    ctx.fillText(`Room: ${online.roomId}`, panelX + 30, panelY + 220);
  }
  ctx.restore();

  const queueW = 270;
  const queueH = 50;
  const queueX = canvas.width / 2 - queueW / 2;
  const queueY = panelY + panelH - 120;
  onlineArenaQueueButtonBounds = { x: queueX, y: queueY, w: queueW, h: queueH };

  ctx.save();
  const queueGrad = ctx.createLinearGradient(queueX, queueY, queueX, queueY + queueH);
  queueGrad.addColorStop(0, queueing ? "rgba(255,130,130,0.3)" : "rgba(100,190,255,0.3)");
  queueGrad.addColorStop(1, queueing ? "rgba(180,70,70,0.25)" : "rgba(40,110,200,0.25)");
  ctx.fillStyle = queueGrad;
  roundRect(ctx, queueX, queueY, queueW, queueH, 12, true, false);
  ctx.strokeStyle = queueing ? "rgba(255,160,160,0.9)" : hexToRgba(currentTheme.glowColor, 0.9);
  ctx.lineWidth = 2;
  roundRect(ctx, queueX, queueY, queueW, queueH, 12, false, true);
  ctx.fillStyle = "#f3fbff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 16px ${UI_FONT}`;
  ctx.fillText(queueing ? "LEAVE QUEUE" : "JOIN QUEUE", queueX + queueW / 2, queueY + queueH / 2 + 1);
  ctx.restore();

  const backW = 220;
  const backH = 38;
  const backX = canvas.width / 2 - backW / 2;
  const backY = queueY + 68;
  onlineArenaBackButtonBounds = { x: backX, y: backY, w: backW, h: backH };

  ctx.save();
  ctx.fillStyle = "rgba(90,130,200,0.2)";
  roundRect(ctx, backX, backY, backW, backH, 10, true, false);
  ctx.strokeStyle = "rgba(170,210,255,0.7)";
  roundRect(ctx, backX, backY, backW, backH, 10, false, true);
  ctx.fillStyle = "#e9f6ff";
  ctx.font = `700 14px ${UI_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("BACK TO MENU", backX + backW / 2, backY + backH / 2 + 1);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = `500 14px ${UI_FONT}`;
  const help = matched
    ? "Match found. Integration hooks are active; wire gameplay sync next."
    : "ENTER toggles queue. ESC returns to menu.";
  ctx.fillText(help, canvas.width / 2, canvas.height - 24);
  ctx.restore();
}

// Leaderboard screen uses the centralized loadLeaderboard function
async function drawLeaderboardScreen(time) {
  drawBackgroundGradient();

  const t = time / 1000;
  const entries = leaderboardData || [];
  leaderboardBackButtonBounds = null;
  leaderboardTabButtonBounds = [];
  const mode = window.leaderboardMode === "vs1v1" ? "vs1v1" : "solo";

  ctx.save();
  ctx.textAlign = "center";
  ctx.shadowColor = hexToRgba(currentTheme.glowColor, 0.8);
  ctx.shadowBlur = 26;
  ctx.fillStyle = "#f3fbff";
  ctx.font = `900 58px ${UI_FONT_HEAVY}`;
  ctx.fillText("GLOBAL LEADERBOARD", canvas.width / 2, 82);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(220,240,255,0.75)";
  ctx.font = `600 14px ${UI_FONT}`;
  ctx.fillText(mode === "vs1v1" ? "Top 1v1 players by rating" : "Top solo score players", canvas.width / 2, 108);
  ctx.restore();

  const tabs = [
    { label: "SOLO", mode: "solo" },
    { label: "1V1 ARENA", mode: "vs1v1" }
  ];
  const tabsY = 124;
  const tabW = 170;
  const tabH = 34;
  const tabGap = 14;
  const tabsX = canvas.width / 2 - ((tabs.length * tabW + (tabs.length - 1) * tabGap) / 2);

  tabs.forEach((tab, idx) => {
    const x = tabsX + idx * (tabW + tabGap);
    const y = tabsY;
    const active = tab.mode === mode;
    leaderboardTabButtonBounds.push({ x, y, w: tabW, h: tabH, mode: tab.mode });

    ctx.save();
    const g = ctx.createLinearGradient(x, y, x, y + tabH);
    g.addColorStop(0, active ? "rgba(100,190,255,0.32)" : "rgba(70,110,180,0.16)");
    g.addColorStop(1, active ? "rgba(50,120,220,0.26)" : "rgba(20,50,120,0.14)");
    ctx.fillStyle = g;
    roundRect(ctx, x, y, tabW, tabH, 9, true, false);
    ctx.strokeStyle = active ? hexToRgba(currentTheme.glowColor, 0.9) : "rgba(160,200,255,0.35)";
    ctx.lineWidth = active ? 2 : 1.2;
    roundRect(ctx, x, y, tabW, tabH, 9, false, true);
    ctx.fillStyle = active ? "#ecf8ff" : "rgba(220,235,255,0.8)";
    ctx.font = active ? `700 13px ${UI_FONT}` : `600 13px ${UI_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tab.label, x + tabW / 2, y + tabH / 2 + 0.5);
    ctx.restore();
  });

  const containerX = canvas.width / 2 - 470;
  const containerY = 172;
  const containerW = 940;
  const containerH = 528;
  const panelPulse = 0.65 + 0.35 * Math.sin(t * 1.8);

  ctx.save();
  ctx.shadowColor = hexToRgba(currentTheme.glowColor, 0.75 * panelPulse);
  ctx.shadowBlur = 34;
  const containerGrad = ctx.createLinearGradient(containerX, containerY, containerX, containerY + containerH);
  containerGrad.addColorStop(0, "rgba(18,40,72,0.85)");
  containerGrad.addColorStop(0.5, "rgba(7,17,35,0.9)");
  containerGrad.addColorStop(1, "rgba(16,34,64,0.85)");
  ctx.fillStyle = containerGrad;
  roundRect(ctx, containerX, containerY, containerW, containerH, 16, true, false);
  ctx.strokeStyle = hexToRgba(currentTheme.glowColor, 0.9);
  ctx.lineWidth = 2.2;
  roundRect(ctx, containerX, containerY, containerW, containerH, 16, false, true);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  roundRect(ctx, containerX + 3, containerY + 3, containerW - 6, containerH - 6, 13, false, true);
  ctx.restore();

  ctx.save();
  const headerY = containerY + 42;
  ctx.font = `700 15px ${UI_FONT}`;
  ctx.fillStyle = "rgba(180,220,255,0.92)";
  ctx.textAlign = "left";
  ctx.fillText("RANK", containerX + 34, headerY);
  ctx.fillText("PLAYER", containerX + 128, headerY);
  if (mode === "vs1v1") {
    ctx.fillText("RATING", containerX + 472, headerY);
    ctx.fillText("MATCHES", containerX + 612, headerY);
    ctx.fillText("W-L", containerX + 770, headerY);
    ctx.fillText("WIN%", containerX + 860, headerY);
  } else {
    ctx.fillText("SCORE", containerX + 572, headerY);
    ctx.fillText("COUNTRY", containerX + 760, headerY);
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = hexToRgba(currentTheme.glowColor || "#ffffff", 0.3);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(containerX + 18, headerY + 14);
  ctx.lineTo(containerX + containerW - 18, headerY + 14);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  const rowH = 30;
  let entryY = headerY + 36;
  entries.slice(0, 15).forEach((e, idx) => {
    const rank = idx + 1;
    const isMedal = rank <= 3;
    const rowY = entryY - rowH / 2;
    const rowGrad = ctx.createLinearGradient(containerX + 16, rowY, containerX + 16, rowY + rowH);
    rowGrad.addColorStop(0, idx % 2 === 0 ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.015)");
    rowGrad.addColorStop(1, "rgba(255,255,255,0.0)");
    ctx.fillStyle = rowGrad;
    roundRect(ctx, containerX + 16, rowY, containerW - 32, rowH, 8, true, false);

    if (isMedal) {
      const medalColors = ["#FFD700", "#C0C0C0", "#CD7F32"];
      ctx.shadowColor = medalColors[rank - 1];
      ctx.shadowBlur = 12;
    } else {
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    }

    const rankBadgeX = containerX + 62;
    const rankBadgeRadius = 12;
    if (isMedal) {
      const medalColors = ["#FFD700", "#C0C0C0", "#CD7F32"];
      const medalBg = ["rgba(255,215,0,0.2)", "rgba(192,192,192,0.2)", "rgba(205,127,50,0.2)"];
      ctx.fillStyle = medalBg[rank - 1];
      ctx.beginPath();
      ctx.arc(rankBadgeX, entryY, rankBadgeRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = medalColors[rank - 1];
      ctx.font = `700 12px ${UI_FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const medals = ["1st", "2nd", "3rd"];
      ctx.fillText(medals[rank - 1], rankBadgeX, entryY + 1);
    } else {
      ctx.fillStyle = "rgba(93,156,255,0.28)";
      ctx.beginPath();
      ctx.arc(rankBadgeX, entryY, rankBadgeRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(130,190,255,0.45)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = `700 12px ${UI_FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(rank, rankBadgeX, entryY);
    }

    ctx.fillStyle = isMedal ? "#ffe08a" : "#f2f8ff";
    ctx.font = isMedal ? `700 18px ${UI_FONT}` : `600 17px ${UI_FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText((e.name || "Player").substring(0, 20), containerX + 128, entryY);

    if (mode === "vs1v1") {
      const rating = Number(e.rating) || 1000;
      const matches = Number(e.matches) || 0;
      const wins = Number(e.wins) || 0;
      const losses = Number(e.losses) || 0;
      const winRate = Number(e.win_rate);

      ctx.fillStyle = isMedal ? "#ffd66b" : "rgba(178,222,255,0.95)";
      ctx.font = isMedal ? `800 19px ${UI_FONT_HEAVY}` : `700 18px ${UI_FONT}`;
      ctx.textAlign = "right";
      ctx.fillText(rating.toLocaleString(), containerX + 574, entryY);

      ctx.fillStyle = "rgba(235,245,255,0.8)";
      ctx.font = `600 14px ${UI_FONT}`;
      ctx.textAlign = "right";
      ctx.fillText(matches.toLocaleString(), containerX + 720, entryY);
      ctx.fillText(`${wins}-${losses}`, containerX + 825, entryY);
      ctx.fillText(`${Number.isFinite(winRate) ? winRate.toFixed(1) : "0.0"}%`, containerX + 914, entryY);
    } else {
      ctx.fillStyle = isMedal ? "#ffd66b" : "rgba(178,222,255,0.95)";
      ctx.font = isMedal ? `800 19px ${UI_FONT_HEAVY}` : `700 18px ${UI_FONT}`;
      ctx.textAlign = "right";
      ctx.fillText((e.score || 0).toLocaleString(), containerX + 690, entryY);

      ctx.fillStyle = "rgba(235,245,255,0.8)";
      ctx.font = `600 14px ${UI_FONT}`;
      ctx.textAlign = "left";
      ctx.fillText(e.country || "N/A", containerX + 760, entryY);
    }

    entryY += 34;
  });
  ctx.restore();

  if (!leaderboardLoaded) {
    ctx.save();
    ctx.fillStyle = "rgba(220,240,255,0.9)";
    ctx.font = `600 20px ${UI_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Loading leaderboard...", canvas.width / 2, containerY + containerH / 2);
    ctx.restore();
  } else if (entries.length === 0) {
    ctx.save();
    ctx.fillStyle = "rgba(220,240,255,0.9)";
    ctx.font = `600 20px ${UI_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(mode === "vs1v1" ? "No 1v1 matches yet." : "No solo scores yet.", canvas.width / 2, containerY + containerH / 2);
    ctx.restore();
  }

  const backW = 210;
  const backH = 38;
  const backX = canvas.width / 2 - backW / 2;
  const backY = containerY + containerH + 18;
  leaderboardBackButtonBounds = { x: backX, y: backY, w: backW, h: backH };

  ctx.save();
  const backGrad = ctx.createLinearGradient(backX, backY, backX, backY + backH);
  backGrad.addColorStop(0, "rgba(100,170,255,0.26)");
  backGrad.addColorStop(1, "rgba(40,90,170,0.26)");
  ctx.fillStyle = backGrad;
  roundRect(ctx, backX, backY, backW, backH, 10, true, false);
  ctx.strokeStyle = hexToRgba(currentTheme.glowColor, 0.7);
  ctx.lineWidth = 1.4;
  roundRect(ctx, backX, backY, backW, backH, 10, false, true);
  ctx.fillStyle = "#e9f6ff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 14px ${UI_FONT}`;
  ctx.fillText("BACK TO MENU", backX + backW / 2, backY + backH / 2 + 1);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = `500 14px ${UI_FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.fillText("Use LEFT/RIGHT to switch tabs. Mouse click is enabled.", canvas.width / 2, canvas.height - 24);
  ctx.restore();
}

// Options screen
function drawOptions(time) {
  drawBackgroundGradient();

  const t = time / 1000;
  const pulse = 0.75 + 0.25 * Math.sin(t * 2.4);

  ctx.save();
  ctx.textAlign = "center";

  ctx.shadowColor = hexToRgba(currentTheme.glowColor, 0.85);
  ctx.shadowBlur = 28;
  ctx.fillStyle = "#f0faff";
  ctx.font = `900 54px ${UI_FONT_HEAVY}`;
  ctx.fillText("SETTINGS", canvas.width / 2, 88);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(220,240,255,0.72)";
  ctx.font = `600 14px ${UI_FONT}`;
  ctx.fillText("Tune visuals, movement, and feel", canvas.width / 2, 114);

  const rows = [
    `Theme: ${THEMES[currentThemeKey].name}`,
    `Move Speed: ${SPEED_PRESETS[speedPresetIndex].name}`,
    `Custom DAS: ${window.CUSTOM_DAS !== null && window.CUSTOM_DAS !== undefined ? window.CUSTOM_DAS + ' ms' : 'Off'}`,
    `Custom ARR: ${window.CUSTOM_ARR !== null && window.CUSTOM_ARR !== undefined ? window.CUSTOM_ARR + ' ms' : 'Off'}`,
    `Custom DCD: ${window.CUSTOM_DCD !== null && window.CUSTOM_DCD !== undefined ? window.CUSTOM_DCD + ' ms' : 'Off'}`,
    `SDF: ${window.CUSTOM_SDF === Infinity ? 'Infinity' : (window.CUSTOM_SDF || 25)}`,
    `Volume: ${(masterVolume * 100) | 0}%`,
    `FPS Display: ${showFPS ? "On" : "Off"}`
  ];
  optionRowBounds = [];

  const containerX = canvas.width / 2 - 430;
  const containerY = 146;
  const containerW = 860;
  const optionH = 56;
  const containerH = rows.length * optionH + 56;

  ctx.shadowColor = hexToRgba(currentTheme.glowColor, 0.75 * pulse);
  ctx.shadowBlur = 32;
  const containerGrad = ctx.createLinearGradient(containerX, containerY, containerX, containerY + containerH);
  containerGrad.addColorStop(0, "rgba(17,37,68,0.9)");
  containerGrad.addColorStop(0.52, "rgba(8,17,34,0.93)");
  containerGrad.addColorStop(1, "rgba(16,34,62,0.9)");
  ctx.fillStyle = containerGrad;
  roundRect(ctx, containerX, containerY, containerW, containerH, 18, true, false);

  ctx.strokeStyle = hexToRgba(currentTheme.glowColor, 0.88);
  ctx.lineWidth = 2;
  roundRect(ctx, containerX, containerY, containerW, containerH, 18, false, true);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  roundRect(ctx, containerX + 3, containerY + 3, containerW - 6, containerH - 6, 15, false, true);

  const headH = 40;
  const headGrad = ctx.createLinearGradient(containerX + 10, containerY + 10, containerX + 10, containerY + 10 + headH);
  headGrad.addColorStop(0, "rgba(255,255,255,0.08)");
  headGrad.addColorStop(1, "rgba(255,255,255,0.02)");
  ctx.fillStyle = headGrad;
  roundRect(ctx, containerX + 10, containerY + 10, containerW - 20, headH, 10, true, false);
  ctx.fillStyle = "rgba(180,220,255,0.92)";
  ctx.font = `700 14px ${UI_FONT}`;
  ctx.textAlign = "left";
  ctx.fillText("PROFILE", containerX + 26, containerY + 35);
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(222,242,255,0.85)";
  ctx.fillText(THEMES[currentThemeKey].name.toUpperCase(), containerX + containerW - 26, containerY + 35);
  ctx.restore();

  ctx.save();
  rows.forEach((label, i) => {
    const y = containerY + 72 + i * optionH;
    const selected = (i === optionsSelection);
    const rowX = containerX + 16;
    const rowW = containerW - 32;
    const rowY = y - 24;
    const rowR = 10;
    const [nameRaw, ...valueParts] = label.split(": ");
    const optName = nameRaw || label;
    const optValue = valueParts.join(": ");

    const rowGrad = ctx.createLinearGradient(rowX, rowY, rowX, rowY + optionH);
    if (selected) {
      rowGrad.addColorStop(0, "rgba(89,155,255,0.22)");
      rowGrad.addColorStop(0.6, "rgba(60,110,220,0.12)");
      rowGrad.addColorStop(1, "rgba(40,80,170,0.16)");
      ctx.fillStyle = rowGrad;
      roundRect(ctx, rowX, rowY, rowW, optionH, rowR, true, false);

      ctx.strokeStyle = hexToRgba(currentTheme.glowColor, 0.95);
      ctx.lineWidth = 2.2;
      roundRect(ctx, rowX, rowY, rowW, optionH, rowR, false, true);
      ctx.fillStyle = "rgba(170,220,255,0.95)";
      ctx.fillRect(rowX + 10, rowY + 8, 4, optionH - 16);
    } else if (i % 2 === 0) {
      rowGrad.addColorStop(0, "rgba(255,255,255,0.045)");
      rowGrad.addColorStop(1, "rgba(255,255,255,0.01)");
      ctx.fillStyle = rowGrad;
      roundRect(ctx, rowX, rowY, rowW, optionH, rowR, true, false);
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.015)";
      roundRect(ctx, rowX, rowY, rowW, optionH, rowR, true, false);
    }

    optionRowBounds.push({
      x: rowX,
      y: rowY,
      w: rowW,
      h: optionH,
      index: i
    });

    ctx.fillStyle = selected ? "#f4fbff" : "rgba(232,245,255,0.9)";
    ctx.font = selected ? `700 17px ${UI_FONT}` : `600 16px ${UI_FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(optName, rowX + 24, y + 2);

    const chipW = Math.max(84, Math.min(220, ctx.measureText(optValue || "").width + 30));
    const chipX = rowX + rowW - chipW - 56;
    const chipY = y - 16;
    const chipGrad = ctx.createLinearGradient(chipX, chipY, chipX, chipY + 32);
    chipGrad.addColorStop(0, selected ? "rgba(132,207,255,0.28)" : "rgba(130,180,240,0.15)");
    chipGrad.addColorStop(1, selected ? "rgba(85,145,236,0.26)" : "rgba(80,120,190,0.12)");
    ctx.fillStyle = chipGrad;
    roundRect(ctx, chipX, chipY, chipW, 32, 8, true, false);
    ctx.strokeStyle = selected ? "rgba(180,230,255,0.72)" : "rgba(170,210,255,0.35)";
    ctx.lineWidth = 1;
    roundRect(ctx, chipX, chipY, chipW, 32, 8, false, true);
    ctx.fillStyle = selected ? "#e9f8ff" : "rgba(224,242,255,0.84)";
    ctx.font = selected ? `700 14px ${UI_FONT}` : `600 13px ${UI_FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(optValue || "", chipX + chipW / 2, y + 2);

    if (selected) {
      ctx.fillStyle = "#b8e8ff";
      ctx.font = `700 18px ${UI_FONT}`;
      ctx.textAlign = "center";
      ctx.fillText("<", rowX + rowW - 36, y + 2);
      ctx.fillText(">", rowX + rowW - 18, y + 2);
    }
  });

  ctx.restore();

  window.getOptionsCount = () => rows.length;

  ctx.save();
  ctx.font = `500 14px ${UI_FONT}`;
  ctx.fillStyle = "rgba(225,241,255,0.72)";
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 5;
  ctx.fillText("Mouse click or keyboard: LEFT/RIGHT adjust, UP/DOWN navigate, ESC return", canvas.width / 2, canvas.height - 50);
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
  ctx.font = `900 50px ${UI_FONT_HEAVY}`;
  ctx.fillText("SELECT BOT DIFFICULTY", canvas.width / 2, 90);

  ctx.font = `500 14px ${UI_FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.shadowBlur = 0;
  ctx.fillText("Choose your opponent's skill level", canvas.width / 2, 125);
  ctx.restore();

  const difficulties = [
    { label: "EASY", desc: "Relaxed opponent", level: 1, color: "#66FF99" },
    { label: "NORMAL", desc: "Balanced challenge", level: 2, color: "#FFD700" },
    { label: "HARD", desc: "Expert difficulty", level: 3, color: "#FF6B6B" }
  ];
  botDifficultyCardBounds = [];

  difficulties.forEach((diff, i) => {
    const x = canvas.width / 2 - 320 + i * 320;
    const y = 320;
    const selected = (i === botDifficultySelection);

    const cardW = 240;
    const cardH = 260;
    botDifficultyCardBounds.push({
      x: x - cardW / 2,
      y: y - cardH / 2,
      w: cardW,
      h: cardH,
      index: i
    });

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
  ctx.fillText("Mouse click or keyboard: LEFT/RIGHT select, ENTER start, ESC cancel", canvas.width / 2, canvas.height - 50);
  ctx.restore();
}

function drawControlsMenu(time) {
  drawBackgroundGradient();

  ctx.save();
  ctx.textAlign = "center";

  const t = time / 1000;
  const pulse = 0.72 + 0.28 * Math.sin(t * 2.1);

  ctx.shadowColor = hexToRgba(currentTheme.glowColor, 0.85);
  ctx.shadowBlur = 28;
  ctx.fillStyle = "#f1fbff";
  ctx.font = `900 52px ${UI_FONT_HEAVY}`;
  ctx.fillText("CONTROLS", canvas.width / 2, 72);

  ctx.font = `600 14px ${UI_FONT}`;
  ctx.fillStyle = "rgba(220,240,255,0.74)";
  ctx.shadowBlur = 0;
  ctx.fillText("Rebind keys with keyboard or click a row and press any key", canvas.width / 2, 104);

  const actionLabels = {
    moveLeft: "Move Left",
    moveRight: "Move Right",
    softDrop: "Soft Drop",
    hardDrop: "Hard Drop",
    rotateCW: "Rotate Clockwise",
    rotateCCW: "Rotate Counter-Clockwise",
    reverseSpin: "Rotate 180",
    hold: "Hold Piece",
    pause: "Pause",
    restart: "Restart",
    undo: "Undo",
    redo: "Redo"
  };

  const groups = [
    { title: "MOVEMENT", actions: ["moveLeft", "moveRight", "softDrop", "hardDrop"] },
    { title: "ROTATION", actions: ["rotateCW", "rotateCCW", "reverseSpin"] },
    { title: "UTILITY", actions: ["hold", "pause", "restart", "undo", "redo"] }
  ];

  let itemIndex = 0;
  let currentY = 152;
  controlItemBounds = [];

  groups.forEach((group) => {
    const itemsInGroup = group.actions.filter(action => action in actionLabels);
    const rows = Math.ceil(itemsInGroup.length / 2);
    const groupContainerH = rows * 58 + 48;

    const groupX = canvas.width / 2 - 500;
    const groupY = currentY - 15;
    const groupW = 1000;

    ctx.save();
    ctx.shadowColor = hexToRgba(currentTheme.glowColor, 0.6 * pulse);
    ctx.shadowBlur = 18;
    const groupGrad = ctx.createLinearGradient(groupX, groupY, groupX, groupY + groupContainerH);
    groupGrad.addColorStop(0, "rgba(18,38,70,0.72)");
    groupGrad.addColorStop(1, "rgba(8,17,34,0.72)");
    ctx.fillStyle = groupGrad;
    roundRect(ctx, groupX, groupY, groupW, groupContainerH, 14, true, false);

    ctx.strokeStyle = "rgba(140,198,255,0.42)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, groupX, groupY, groupW, groupContainerH, 14, false, true);
    ctx.restore();

    ctx.save();
    const badgeW = 130;
    const badgeX = groupX + 20;
    const badgeY = groupY + 10;
    const badgeGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX, badgeY + 24);
    badgeGrad.addColorStop(0, "rgba(130,210,255,0.24)");
    badgeGrad.addColorStop(1, "rgba(90,130,220,0.2)");
    ctx.fillStyle = badgeGrad;
    roundRect(ctx, badgeX, badgeY, badgeW, 24, 8, true, false);
    ctx.strokeStyle = "rgba(170,225,255,0.48)";
    ctx.lineWidth = 1;
    roundRect(ctx, badgeX, badgeY, badgeW, 24, 8, false, true);
    ctx.font = `700 12px ${UI_FONT}`;
    ctx.fillStyle = "#ddf5ff";
    ctx.textAlign = "left";
    ctx.fillText(group.title, badgeX + 12, badgeY + 17);
    ctx.restore();

    currentY += 46;

    itemsInGroup.forEach((action, idx) => {
      const row = Math.floor(idx / 2);
      const col = idx % 2;

      const x = groupX + 50 + col * 500;
      const y = currentY + row * 56;

      const selected = (itemIndex === controlsSelection);
      const keyBind = controlsConfig[action] || "?";
      const waitingForThis = (waitingForKeyBinding === action);

      ctx.save();
      const boxWidth = 420;
      const boxHeight = 50;
      controlItemBounds.push({
        x,
        y: y - boxHeight / 2,
        w: boxWidth,
        h: boxHeight,
        index: itemIndex
      });

      const gradient = ctx.createLinearGradient(x, y - boxHeight / 2, x, y + boxHeight / 2);

      if (selected || waitingForThis) {
        gradient.addColorStop(0, "rgba(104,181,255,0.3)");
        gradient.addColorStop(0.5, "rgba(72,128,220,0.2)");
        gradient.addColorStop(1, "rgba(72,128,220,0.26)");
        ctx.shadowBlur = 20;
        ctx.shadowColor = hexToRgba(currentTheme.glowColor, 0.9);
      } else {
        gradient.addColorStop(0, "rgba(255,255,255,0.06)");
        gradient.addColorStop(1, "rgba(255,255,255,0.015)");
        ctx.shadowBlur = 5;
        ctx.shadowColor = "rgba(0,0,0,0.2)";
      }

      ctx.fillStyle = gradient;
      roundRect(ctx, x, y - boxHeight / 2, boxWidth, boxHeight, 8, true, false);

      ctx.strokeStyle = selected || waitingForThis ? hexToRgba(currentTheme.glowColor, 0.95) : "rgba(255,255,255,0.18)";
      ctx.lineWidth = selected || waitingForThis ? 2.1 : 1;
      roundRect(ctx, x, y - boxHeight / 2, boxWidth, boxHeight, 8, false, true);
      if (selected || waitingForThis) {
        ctx.fillStyle = "rgba(164,223,255,0.92)";
        ctx.fillRect(x + 9, y - boxHeight / 2 + 8, 4, boxHeight - 16);
      }

      if (waitingForThis) {
        const waitPulse = 0.65 + 0.35 * Math.sin(t * 4);
        ctx.globalAlpha = waitPulse;
        ctx.strokeStyle = "#ffff00";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + 20, y, 16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      ctx.restore();

      ctx.font = selected || waitingForThis ? `700 14px ${UI_FONT}` : `600 14px ${UI_FONT}`;
      ctx.fillStyle = selected || waitingForThis ? "#f0fbff" : "rgba(236,246,255,0.83)";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(actionLabels[action] || action, x + 24, y);

      ctx.save();
      const badgeWidth = 80;
      const badgeHeight = 28;
      const badgeX = x + boxWidth - badgeWidth - 10;
      const badgeY = y - badgeHeight / 2;

      if (waitingForThis) {
        ctx.fillStyle = "rgba(255,239,127,0.14)";
        roundRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 6, true, false);
        ctx.strokeStyle = "rgba(255,239,127,0.5)";
        ctx.lineWidth = 1;
        roundRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 6, false, true);
        ctx.fillStyle = "#ffef9f";
        ctx.font = `700 10px ${UI_FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Press key", badgeX + badgeWidth / 2, y);
      } else {
        const keyGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX, badgeY + badgeHeight);
        keyGrad.addColorStop(0, selected ? "rgba(125,231,255,0.24)" : "rgba(150,200,255,0.16)");
        keyGrad.addColorStop(1, selected ? "rgba(87,163,235,0.22)" : "rgba(105,144,214,0.12)");
        ctx.fillStyle = keyGrad;
        roundRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 6, true, false);
        ctx.strokeStyle = selected ? "rgba(168,236,255,0.7)" : "rgba(167,210,255,0.42)";
        ctx.lineWidth = 1;
        roundRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 6, false, true);
        ctx.fillStyle = selected ? "#d9f8ff" : "rgba(224,242,255,0.88)";
        ctx.font = "700 12px Consolas, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(keyBind, badgeX + badgeWidth / 2, y);
      }
      ctx.restore();

      itemIndex++;
    });

    currentY += rows * 58 + 20;
  });

  ctx.save();
  ctx.font = `500 13px ${UI_FONT}`;
  ctx.fillStyle = "rgba(225,241,255,0.74)";
  ctx.textAlign = "center";
  ctx.shadowBlur = 5;
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.fillText("Mouse click or keyboard: UP/DOWN Navigate, ENTER Rebind, ESC Back", canvas.width / 2, canvas.height - 40);
  ctx.restore();
}

// Name entry screen
function drawNameEntry() {
  drawBackgroundGradient();

  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = currentTheme.hudTextColor;

  ctx.font = `900 42px ${UI_FONT_HEAVY}`;
  ctx.fillText("ENTER YOUR NAME", canvas.width / 2, 200);

  ctx.font = `600 28px ${UI_FONT}`;
  ctx.fillText(tempName || "_", canvas.width / 2, 280);

  ctx.font = `500 18px ${UI_FONT}`;
  ctx.fillText("Press ENTER to submit", canvas.width / 2, 340);

  // Show brief on-screen validation if name was empty on submit
  const invalidUntil = window.nameEntryInvalidUntil || 0;
  if (Date.now() < invalidUntil) {
    const t = Date.now();
    const alpha = 0.6 + 0.4 * Math.abs(Math.sin((t % 400) / 400 * Math.PI * 2));
    ctx.fillStyle = `rgba(255,80,80,${alpha.toFixed(3)})`;
    ctx.font = `500 16px ${UI_FONT}`;
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

function drawProfileEntry() {
  drawBackgroundGradient();

  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = currentTheme.hudTextColor;

  ctx.shadowColor = hexToRgba(currentTheme.glowColor, 0.8);
  ctx.shadowBlur = 22;
  ctx.font = `900 44px ${UI_FONT_HEAVY}`;
  ctx.fillText("WELCOME", canvas.width / 2, 170);
  ctx.shadowBlur = 0;

  ctx.font = `600 22px ${UI_FONT}`;
  ctx.fillStyle = "rgba(230,245,255,0.9)";
  ctx.fillText("Enter your player name", canvas.width / 2, 228);

  ctx.fillStyle = "#f3fbff";
  ctx.font = `700 32px ${UI_FONT}`;
  ctx.fillText(tempName || "_", canvas.width / 2, 306);

  ctx.font = `500 16px ${UI_FONT}`;
  ctx.fillStyle = "rgba(210,235,255,0.82)";
  ctx.fillText("Press ENTER to continue", canvas.width / 2, 356);

  const invalidUntil = window.nameEntryInvalidUntil || 0;
  if (Date.now() < invalidUntil) {
    const tt = Date.now();
    const alpha = 0.6 + 0.4 * Math.abs(Math.sin((tt % 400) / 400 * Math.PI * 2));
    ctx.fillStyle = `rgba(255,80,80,${alpha.toFixed(3)})`;
    ctx.font = `500 16px ${UI_FONT}`;
    ctx.fillText("Please enter a name", canvas.width / 2, 334);
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
window.drawOnlineArenaScreen = drawOnlineArenaScreen;
window.drawLeaderboardScreen = drawLeaderboardScreen;
window.drawOptions = drawOptions;
window.drawBotDifficultySelect = drawBotDifficultySelect;
window.drawControlsMenu = drawControlsMenu;
window.drawNameEntry = drawNameEntry;
window.drawProfileEntry = drawProfileEntry;
window.drawPopups = drawPopups;
window.drawBlock = drawBlock;
// Solo type selection screen: Competitive or Casual
function drawSoloTypeSelect() {
  drawBackgroundGradient();
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = currentTheme.hudTextColor;

  ctx.font = `900 42px ${UI_FONT_HEAVY}`;
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
  soloTypeCardBounds = [];

  for (let i = 0; i < options.length; i++) {
    const x = startX + i * (cardW + gap);
    const y = startY;
    const opt = options[i];
    const selected = (window.soloTypeSelection || 0) === i;
    soloTypeCardBounds.push({ x, y, w: cardW, h: cardH, index: i });

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
  ctx.font = `500 15px ${UI_FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText("Use LEFT/RIGHT to choose, ENTER to confirm. Competitive uploads score.", canvas.width / 2, canvas.height - 72);

  ctx.restore();
}

window.drawSoloTypeSelect = drawSoloTypeSelect;

