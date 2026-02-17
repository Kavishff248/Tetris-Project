window.addEventListener("DOMContentLoaded", () => {
  console.log("Main.js ready — Supabase leaderboard active");
  if (window.loadSettingsForProfile && window.getActiveProfileName) {
    window.loadSettingsForProfile(window.getActiveProfileName());
  }
});

if (window.setupThemeOverlays) window.setupThemeOverlays();

let themeTransition = 0;
let themeTransitioning = false;
let themeOld = null;

function startThemeTransition(oldTheme, newTheme) {
  if (!oldTheme || oldTheme === newTheme) return;
  themeTransition = 1;
  themeTransitioning = true;
  themeOld = oldTheme;
}

function updateThemeTransition(dt) {
  if (!themeTransitioning) return;
  themeTransition -= dt * 1.5;
  if (themeTransition <= 0) {
    themeTransitioning = false;
    themeTransition = 0;
    themeOld = null;
  }
}

function drawThemeTransitionOverlay(ctx) {
  if (!themeTransitioning || !themeOld) return;
  ctx.save();
  ctx.globalAlpha = themeTransition * 0.8;
  const bg = themeOld.backgroundGradient && themeOld.backgroundGradient[0] ? themeOld.backgroundGradient[0] : themeOld.boardBg;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

// Draw helpers used in loop
function drawSolo(time) {
  drawBackgroundGradient();

  drawHUDSolo();
  drawHold(solo, SOLO_BOARD_X - BLOCK * 5, SOLO_BOARD_Y + 10);
  drawNext(solo, SOLO_BOARD_X + COLS * BLOCK + BLOCK, SOLO_BOARD_Y + 10);
  drawBoard(solo, SOLO_BOARD_X, SOLO_BOARD_Y, currentTheme);
  drawPopups();

  const menuBtn = drawMainMenuButton();
  soloMenuButtonBounds = menuBtn;

  if (window.soloType === 'casual') {
    const restartBtn = drawSoloRestartButton();
    soloRestartButtonBounds = restartBtn;
  } else {
    soloRestartButtonBounds = null;
  }

  if (gameState === "gameover" && gameMode === "solo") {
    ctx.fillStyle = currentTheme.hudTextColor;
    ctx.font = "30px Arial";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, 260);
    ctx.font = "16px Arial";
    if (window.soloType === 'casual') {
      ctx.fillText("Press R to restart | ESC to Menu", canvas.width / 2, 290);
    } else {
      ctx.fillText("Press ESC to return to Menu", canvas.width / 2, 290);
    }
    return;
  }
}

function drawVS(time) {
  drawBackgroundGradient();

  drawHUDVS();
  drawHold(player, VS_PLAYER_BOARD_X - BLOCK * 5, VS_BOARD_Y + 10);
  drawNext(player, VS_PLAYER_BOARD_X + COLS * BLOCK + BLOCK, VS_BOARD_Y + 10);
  drawHold(bot, VS_BOT_BOARD_X - BLOCK * 5, VS_BOARD_Y + 10);
  drawNext(bot, VS_BOT_BOARD_X + COLS * BLOCK + BLOCK, VS_BOARD_Y + 10);
  drawBoard(player, VS_PLAYER_BOARD_X, VS_BOARD_Y, currentTheme);
  drawBoard(bot, VS_BOT_BOARD_X, VS_BOARD_Y, currentTheme);
  drawPopups();

  const menuBtn = drawMainMenuButton();
  vsMenuButtonBounds = menuBtn;

  if (gameState === "gameover" && gameMode === "vsBot") {
    drawVSWinScreen(performance.now());
    return;
  }
}

// Small helper functions for menu buttons and pause overlay (kept same)
function drawMainMenuButton() {
  const w = 50;
  const h = 38;
  const x = canvas.width - w - 40;
  const y = 40;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  ctx.fillStyle = "#fff";
  ctx.font = "24px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("≡", x + w / 2, y + h / 2);

  ctx.restore();

  return { x, y, w, h };
}

function drawSoloRestartButton() {
  const w = 170;
  const h = 38;
  const x = canvas.width - w - 40;
  const y = 40 + 44;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  ctx.fillStyle = "#fff";
  ctx.font = "18px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("RESTART SOLO", x + w / 2, y + h / 2);

  ctx.restore();

  return { x, y, w, h };
}

function drawPauseOverlay() {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#fff";
  ctx.font = "32px Arial";
  ctx.textAlign = "center";
  ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2 - 20);
  ctx.font = "18px Arial";
  ctx.fillText("Press P to Resume", canvas.width / 2, canvas.height / 2 + 20);

  drawMainMenuButton();

  ctx.restore();
}

// VS win screen (kept same visuals)
function drawVSWinScreen(time) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const playerAlive = player.alive;
  const botAlive = bot.alive;
  const playerWins = playerAlive && !botAlive;
  const botWins = botAlive && !playerAlive;

  const glowIntensity = Math.sin(time * 0.003) * 0.3 + 0.7;

  if (playerWins) {
    const glowColor = `rgba(0, 255, 100, ${glowIntensity * 0.5})`;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 50;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = "rgba(0, 255, 100, 1)";
    ctx.font = "bold 80px Arial";
    ctx.textAlign = "center";
    ctx.fillText("YOU WIN!", canvas.width / 2, canvas.height / 2 - 80);

    ctx.shadowColor = "rgba(0, 255, 100, 0.3)";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "rgba(100, 255, 150, 0.9)";
    ctx.font = "30px Arial";
    ctx.fillText("VICTORY AGAINST THE BOT", canvas.width / 2, canvas.height / 2 - 10);

  } else if (botWins) {
    const glowColor = `rgba(255, 80, 80, ${glowIntensity * 0.5})`;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 50;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = "rgba(255, 100, 100, 1)";
    ctx.font = "bold 80px Arial";
    ctx.textAlign = "center";
    ctx.fillText("YOU LOST!", canvas.width / 2, canvas.height / 2 - 80);

    ctx.shadowColor = "rgba(255, 80, 80, 0.3)";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "rgba(255, 150, 150, 0.9)";
    ctx.font = "30px Arial";
    ctx.fillText("THE BOT DEFEATED YOU", canvas.width / 2, canvas.height / 2 - 10);
  }

  ctx.shadowColor = "rgba(0, 0, 0, 0)";
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(200, 200, 200, 0.9)";
  ctx.font = "22px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`Your Score: ${player.score}`, canvas.width / 2, canvas.height / 2 + 60);
  ctx.fillText(`Bot Score: ${bot.score}`, canvas.width / 2, canvas.height / 2 + 100);

  const borderGlow = Math.sin(time * 0.002) * 3 + 7;
  ctx.strokeStyle = playerWins ? `rgba(0, 255, 100, 0.6)` : `rgba(255, 100, 100, 0.6)`;
  ctx.lineWidth = borderGlow;
  ctx.strokeRect(canvas.width / 2 - 350, canvas.height / 2 - 150, 700, 300);

  ctx.fillStyle = "rgba(100, 150, 255, 0.7)";
  ctx.fillRect(canvas.width / 2 - 240, canvas.height / 2 + 160, 220, 50);
  ctx.fillStyle = "rgba(100, 255, 150, 0.7)";
  ctx.fillRect(canvas.width / 2 + 20, canvas.height / 2 + 160, 220, 50);

  ctx.fillStyle = "rgba(255, 255, 255, 1)";
  ctx.font = "18px Arial";
  ctx.textAlign = "center";
  ctx.fillText("ESC to Menu", canvas.width / 2 - 130, canvas.height / 2 + 190);
  ctx.fillText("R to Restart", canvas.width / 2 + 130, canvas.height / 2 + 190);
}

// Game loop
function gameLoop(timestamp) {
  if (!lastTime) {
    lastTime = timestamp;
    fpsLast = timestamp;
  }
  const delta = timestamp - lastTime;
  lastTime = timestamp;

  fpsAccum += delta;
  fpsFrames++;
  if (timestamp - fpsLast >= 500) {
    fps = Math.round((fpsFrames * 1000) / (timestamp - fpsLast));
    fpsFrames = 0;
    fpsLast = timestamp;
  }

  updatePopups(delta);

  // Theme transition update
  updateThemeTransition(delta / 1000);

  if (gameState === "profileEntry") {
    if (window.drawProfileEntry) window.drawProfileEntry();

  } else if (gameState === "menu") {
    drawMainMenu(timestamp);

  } else if (gameState === "options") {
    drawOptions(timestamp);

  } else if (gameState === "botDifficultySelect") {
    drawBotDifficultySelect(timestamp);

  } else if (gameState === 'soloTypeSelect') {
    if (window.drawSoloTypeSelect) window.drawSoloTypeSelect();

  } else if (gameState === "controls") {
    drawControlsMenu(timestamp);

  } else if (gameState === "leaderboard") {
    // centralized leaderboard screen
    drawLeaderboardScreen(timestamp);

  } else if (gameState === "nameEntry") {
    drawNameEntry();

  } else if (gameState === "paused") {
    if (gameMode === "solo") drawSolo(timestamp);
    else if (gameMode === "vsBot") drawVS(timestamp);
    drawPauseOverlay();

  } else if (gameState === "playing" || gameState === "gameover") {
    const now = performance.now();

    if (gameMode === "solo") {
      if (!solo.piece) spawnPiece(solo);

      if (gameState === "playing") {
        if (cheatActive) {
          updateBotPlayer(solo, now);
        } else {
          updatePlayer(solo, now);
        }
      }

      drawSolo(timestamp);
      if (window.runSoloEffects) runSoloEffects();
    } else if (gameMode === "vsBot") {
      if (!player.piece) spawnPiece(player);
      if (!bot.piece) spawnPiece(bot);

      // In VS, once someone tops out and gameState flips to gameover,
      // stop all further updates immediately.
      if (gameState === "playing") {
        if (cheatActive) {
          updateBotPlayer(player, now);
        } else {
          updatePlayer(player, now);
        }
      }

      if (gameState === "playing") {
        updateBotPlayer(bot, now);
      }

      drawVS(timestamp);
      if (window.runVSEffects) runVSEffects();
    }
  }

  // Theme overlay draw
  drawThemeTransitionOverlay(ctx);

  // FX update/draw
  if (window.fxUpdateAndDraw) window.fxUpdateAndDraw(ctx, timestamp);

  requestAnimationFrame(gameLoop);
}

function pointInRect(px, py, r) {
  return !!r && px >= r.x && py >= r.y && px <= r.x + r.w && py <= r.y + r.h;
}

function getMouseCanvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

function findHit(bounds, x, y) {
  if (!Array.isArray(bounds)) return null;
  for (let i = 0; i < bounds.length; i++) {
    if (pointInRect(x, y, bounds[i])) return bounds[i];
  }
  return null;
}

function handleCanvasMouseMove(e) {
  const p = getMouseCanvasPos(e);
  let hover = false;

  if (gameState === "menu") {
    const hit = findHit(topRightMenuButtons, p.x, p.y);
    if (hit) {
      menuSelection = hit.index;
      hover = true;
    }
  } else if (gameState === "options") {
    const hit = findHit(optionRowBounds, p.x, p.y);
    if (hit) {
      optionsSelection = hit.index;
      hover = true;
    }
  } else if (gameState === "botDifficultySelect") {
    const hit = findHit(botDifficultyCardBounds, p.x, p.y);
    if (hit) {
      botDifficultySelection = hit.index;
      hover = true;
    }
  } else if (gameState === "controls") {
    const hit = findHit(controlItemBounds, p.x, p.y);
    if (hit) {
      controlsSelection = hit.index;
      hover = true;
    }
  } else if (gameState === "soloTypeSelect") {
    const hit = findHit(soloTypeCardBounds, p.x, p.y);
    if (hit) {
      window.soloTypeSelection = hit.index;
      hover = true;
    }
  } else if (gameState === "leaderboard") {
    hover = pointInRect(p.x, p.y, leaderboardBackButtonBounds);
  } else if (gameState === "playing" || gameState === "paused" || gameState === "gameover") {
    const menuBtn = gameMode === "solo" ? soloMenuButtonBounds : vsMenuButtonBounds;
    const onMenu = pointInRect(p.x, p.y, menuBtn);
    const onRestart = pointInRect(p.x, p.y, soloRestartButtonBounds);
    hover = onMenu || onRestart;
  }

  canvas.style.cursor = hover ? "pointer" : "default";
}

function handleCanvasClick(e) {
  const p = getMouseCanvasPos(e);

  if (gameState === "menu") {
    const hit = findHit(topRightMenuButtons, p.x, p.y);
    if (hit) {
      menuSelection = hit.index;
      handleMainMenuSelection();
    }
    return;
  }

  if (gameState === "options") {
    const hit = findHit(optionRowBounds, p.x, p.y);
    if (hit) {
      optionsSelection = hit.index;
      const dir = p.x < hit.x + hit.w / 2 ? -1 : 1;
      handleOptionChange(dir);
    }
    return;
  }

  if (gameState === "botDifficultySelect") {
    const hit = findHit(botDifficultyCardBounds, p.x, p.y);
    if (hit) {
      botDifficultySelection = hit.index;
      botDifficulty = botDifficultySelection;
      applyBotDifficulty();
      startVSBot();
    }
    return;
  }

  if (gameState === "controls") {
    const hit = findHit(controlItemBounds, p.x, p.y);
    if (hit) {
      controlsSelection = hit.index;
      waitingForKeyBinding = ACTIONS[controlsSelection];
    }
    return;
  }

  if (gameState === "soloTypeSelect") {
    const hit = findHit(soloTypeCardBounds, p.x, p.y);
    if (hit) {
      window.soloTypeSelection = hit.index;
      startSolo(window.soloTypeSelection === 1 ? "casual" : "competitive");
    }
    return;
  }

  if (gameState === "leaderboard") {
    if (pointInRect(p.x, p.y, leaderboardBackButtonBounds)) {
      gameState = "menu";
    }
    return;
  }

  if (gameState === "playing" || gameState === "paused" || gameState === "gameover") {
    const menuBtn = gameMode === "solo" ? soloMenuButtonBounds : vsMenuButtonBounds;
    if (pointInRect(p.x, p.y, menuBtn)) {
      gameState = "menu";
      gameMode = null;
      return;
    }

    if (gameMode === "solo" && window.soloType === "casual" && pointInRect(p.x, p.y, soloRestartButtonBounds)) {
      startSolo("casual");
    }
  }
}

canvas.addEventListener("mousemove", handleCanvasMouseMove);
canvas.addEventListener("click", handleCanvasClick);
canvas.addEventListener("mouseleave", () => {
  canvas.style.cursor = "default";
});

// Input handling (keeps original behavior but fixes option index bug and key binding)
document.addEventListener("keydown", (e) => {
  if (e.repeat && !(gameState === "options" && (e.key === "ArrowLeft" || e.key === "ArrowRight"))) return;

  if (e.key === "Tab") {
    e.preventDefault();
    cheatActive = true;
    return;
  }

  if (waitingForKeyBinding) {
    if (e.key === "Escape") {
      e.preventDefault();
      waitingForKeyBinding = null;
      return;
    }
    e.preventDefault();
    const desc = describeKeyEvent(e);
    controlsConfig[waitingForKeyBinding] = desc;
    waitingForKeyBinding = null;
    if (window.saveSettingsForProfile && window.getActiveProfileName) {
      window.saveSettingsForProfile(window.getActiveProfileName());
    }
    return;
  }

  let pState = (gameMode === "solo") ? solo : player;

  if (gameState === "profileEntry") {
    if (e.key === "Enter") {
      const finalName = tempName.trim();
      if (!finalName) {
        window.nameEntryInvalidUntil = Date.now() + 800;
        return;
      }
      if (window.setActiveProfileName) window.setActiveProfileName(finalName);
      if (window.loadSettingsForProfile && window.getActiveProfileName) {
        window.loadSettingsForProfile(window.getActiveProfileName());
      }
      gameState = "menu";
      return;
    }
    if (e.key === "Backspace") {
      tempName = tempName.slice(0, -1);
      return;
    }
    if (tempName.length < 12 && e.key.length === 1) {
      tempName += e.key;
    }
    return;
  }

  if (gameState === "menu") {
    if (e.key === "ArrowUp") {
      menuSelection = (menuSelection + 5 - 1) % 5;
    } else if (e.key === "ArrowDown") {
      menuSelection = (menuSelection + 1) % 5;
    } else if (e.key === "Enter") {
      handleMainMenuSelection();
    }
    return;
  }

  if (gameState === "botDifficultySelect") {
    if (e.key === "ArrowLeft") {
      botDifficultySelection = (botDifficultySelection + 3 - 1) % 3;
    } else if (e.key === "ArrowRight") {
      botDifficultySelection = (botDifficultySelection + 1) % 3;
    } else if (e.key === "Enter") {
      botDifficulty = botDifficultySelection;
      applyBotDifficulty();
      startVSBot();
    } else if (e.key === "Escape") {
      gameState = "menu";
    }
    return;
  }

  if (gameState === 'soloTypeSelect') {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      window.soloTypeSelection = (window.soloTypeSelection + 2 - 1) % 2;
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      window.soloTypeSelection = (window.soloTypeSelection + 1) % 2;
    } else if (e.key === 'Enter') {
      const type = window.soloTypeSelection === 1 ? 'casual' : 'competitive';
      startSolo(type);
    } else if (e.key === 'Escape') {
      gameState = 'menu';
    }
    return;
  }

  if (gameState === "options") {
    const optionsCount = window.getOptionsCount ? window.getOptionsCount() : 5;
    if (e.key === "ArrowUp") {
      optionsSelection = (optionsSelection + optionsCount - 1) % optionsCount;
    } else if (e.key === "ArrowDown") {
      optionsSelection = (optionsSelection + 1) % optionsCount;
    } else if (e.key === "ArrowLeft") {
      handleOptionChange(-1);
    } else if (e.key === "ArrowRight") {
      handleOptionChange(1);
    } else if (e.key === "Escape") {
      // Apply adjustments and clear overlays if theme changed
      const oldTheme = currentTheme;
      applyOptionsAdjustments();
      if (oldTheme !== currentTheme && window.fxClearOverlays) {
        window.fxClearOverlays();
        if (window.setupThemeOverlays) window.setupThemeOverlays();
      }
      gameState = "menu";
    }
    return;
  }

  if (gameState === "controls") {
    const controlsCount = ACTIONS.length;
    if (e.key === "ArrowUp") {
      controlsSelection = (controlsSelection + controlsCount - 1) % controlsCount;
    } else if (e.key === "ArrowDown") {
      controlsSelection = (controlsSelection + 1) % controlsCount;
    } else if (e.key === "Enter") {
      waitingForKeyBinding = ACTIONS[controlsSelection];
    } else if (e.key === "Escape") {
      waitingForKeyBinding = null;
      gameState = "menu";
    }
    return;
  }

  if (gameState === "nameEntry") {
    if (e.key === "Enter") {
      const finalName = tempName.trim();
      if (!finalName) {
        window.nameEntryInvalidUntil = Date.now() + 800;
        return;
      }
      if (window.setActiveProfileName) window.setActiveProfileName(finalName);
      if (window.saveSettingsForProfile && window.getActiveProfileName) {
        window.saveSettingsForProfile(window.getActiveProfileName());
      }
      if (window.submitScore) window.submitScore(finalName, pendingScore, playerCountry);
      gameState = "leaderboard";
      return;
    }
    if (e.key === "Backspace") {
      tempName = tempName.slice(0, -1);
      return;
    }
    if (tempName.length < 12 && e.key.length === 1) {
      tempName += e.key;
    }
    return;
  }

  if (e.key === "Escape") {
    gameState = "menu";
    gameMode = null;
    return;
  }

  const action = actionFromKeyEvent(e);

  if (action === "pause" || e.key.toLowerCase() === "p") {
    if (gameState === "playing") gameState = "paused";
    else if (gameState === "paused") gameState = "playing";
    return;
  }

  if (gameMode === "solo" && gameState === "playing") {
    if (window.soloType === 'casual') {
      if (action === "undo") {
        e.preventDefault();
        undoSolo();
        return;
      }
      if (action === "redo") {
        e.preventDefault();
        redoSolo();
        return;
      }
    }
  }

  if (gameState === "gameover") {
    if (action === "restart" || e.key.toLowerCase() === "r") {
      if (gameMode === "solo") {
        if (window.soloType === 'casual') startSolo('casual');
      } else if (gameMode === "vsBot") startVSBot();
    }
    return;
  }

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
    e.preventDefault();
    if (gameMode === "solo") undoSolo();
    return;
  }

  if (gameState !== "playing") return;
  pState = (gameMode === "solo") ? solo : player;

  if (e.key === "ArrowUp") {
    rotate(pState, 1);
    return;
  }

  if (action === "moveLeft") {
    keys.left = true;
    beginHorizontalInput(pState, -1, pState.dasDir === 1);
  } else if (action === "moveRight") {
    keys.right = true;
    beginHorizontalInput(pState, 1, pState.dasDir === -1);
  } else if (action === "softDrop") {
    keys.softDrop = true;
    pState.softDropping = true;
  } else if (action === "hardDrop") {
    keys.hardDrop = true;
    if (gameMode === "solo" && pState === solo) pushUndoEveryAction();
    const dy = hardDropDistance(pState);
    pState.pieceY += dy;
    // set lock time to now to avoid immediate double-lock issues
    pState.lastLockTime = performance.now();
    lockPiece(pState);
  } else if (action === "rotateCW") {
    rotate(pState, 1);
  } else if (action === "rotateCCW") {
    rotate(pState, -1);
  } else if (action === "reverseSpin") {
    rotate180(pState);
  } else if (action === "hold") {
    holdPiece(pState);
  } else if (action === "restart") {
    if (gameMode === "solo") {
      if (window.soloType === 'casual') startSolo('casual');
    } else if (gameMode === "vsBot") startVSBot();
  }
});

document.addEventListener("keyup", (e) => {
  const pState = (gameMode === "solo") ? solo : player;
  if (!pState) return;

  if (e.key === "Tab") {
    cheatActive = false;
    return;
  }

  const action = actionFromKeyEvent(e);

  if (action === "moveLeft") {
    keys.left = false;
    if (pState.dasDir === -1) {
      if (keys.right) beginHorizontalInput(pState, 1, true);
      else {
        pState.dasDir = 0;
        pState.dasTime = 0;
        pState.arrTime = 0;
      }
    }
  } else if (action === "moveRight") {
    keys.right = false;
    if (pState.dasDir === 1) {
      if (keys.left) beginHorizontalInput(pState, -1, true);
      else {
        pState.dasDir = 0;
        pState.dasTime = 0;
        pState.arrTime = 0;
      }
    }
  } else if (action === "softDrop") {
    keys.softDrop = false;
    pState.softDropping = false;
  }
});

// Option change handler fixed to match options list indices
function handleOptionChange(dir) {
  if (optionsSelection === 0) {
    const themeKeys = Object.keys(THEMES);
    let idx = themeKeys.indexOf(currentThemeKey);
    idx = (idx + dir + themeKeys.length) % themeKeys.length;
    const oldTheme = currentTheme;
    currentThemeKey = themeKeys[idx];
    currentTheme = THEMES[currentThemeKey];
    startThemeTransition(oldTheme, currentTheme);
    if (window.fxClearOverlays) window.fxClearOverlays();
    if (window.setupThemeOverlays) window.setupThemeOverlays();
  } else if (optionsSelection === 1) {
    speedPresetIndex = (speedPresetIndex + dir + SPEED_PRESETS.length) % SPEED_PRESETS.length;
    applySpeedPreset();
  } else if (optionsSelection === 2) {
    // Custom DAS (ms) - step 10ms, 0 -> Off (null)
    let cur = window.CUSTOM_DAS;
    if (cur === null || cur === undefined) cur = DAS;
    cur = Math.max(0, cur + dir * 10);
    if (cur === 0) cur = null;
    window.setCustomPlayerSpeeds(cur, window.CUSTOM_ARR);
  } else if (optionsSelection === 3) {
    // Custom ARR (ms) - step 5ms, 0 -> Off (null)
    let cur = window.CUSTOM_ARR;
    if (cur === null || cur === undefined) cur = ARR;
    cur = Math.max(0, cur + dir * 5);
    if (cur === 0) cur = null;
    window.setCustomPlayerSpeeds(window.CUSTOM_DAS, cur);
  } else if (optionsSelection === 4) {
    // Custom DCD (ms) - step 5ms, 0 -> Off (null)
    let cur = window.CUSTOM_DCD;
    if (cur === null || cur === undefined) cur = DCD;
    cur = Math.max(0, cur + dir * 5);
    if (cur === 0) cur = null;
    window.setCustomPlayerSpeeds(window.CUSTOM_DAS, window.CUSTOM_ARR, cur);
  } else if (optionsSelection === 5) {
    // SDF: 1..40 cells/s, then Infinity (instant drop)
    let cur = window.CUSTOM_SDF;
    if (cur === null || cur === undefined) cur = SDF;

    if (dir > 0) {
      if (cur === Infinity) cur = 1;
      else if (cur >= 40) cur = Infinity;
      else cur += 1;
    } else if (dir < 0) {
      if (cur === Infinity) cur = 40;
      else if (cur <= 1) cur = Infinity;
      else cur -= 1;
    }

    if (window.setSdf) window.setSdf(cur);
    else if (window.setSoftDropSpeed) window.setSoftDropSpeed(cur);
  } else if (optionsSelection === 6) {
    masterVolume = Math.min(1, Math.max(0, masterVolume + dir * 0.1));
  } else if (optionsSelection === 7) {
    showFPS = !showFPS;
  }

  if (window.saveSettingsForProfile && window.getActiveProfileName) {
    window.saveSettingsForProfile(window.getActiveProfileName());
  }
}

// Start functions
function startSolo() {
  // default to competitive if not specified
  const type = arguments.length > 0 ? arguments[0] : 'competitive';
  window.soloType = type;
  currentTheme = THEMES[currentThemeKey];
  solo = createPlayerState();
  // Only initialize undo/redo stacks for casual mode
  if (window.soloType === 'casual') {
    soloUndoStack = [];
    soloRedoStack = [];
    soloUndoStack.push(clonePlayerState(solo));
  } else {
    soloUndoStack = [];
    soloRedoStack = [];
  }
  gameMode = "solo";
  gameState = "playing";
  popups = [];
}

function startVSBot() {
  currentTheme = THEMES[currentThemeKey];
  player = createPlayerState();
  bot = createPlayerState();
  gameMode = "vsBot";
  gameState = "playing";
  popups = [];
}

// Apply options adjustments (theme, speed, volume, fps, glow)
function applyOptionsAdjustments() {

}

// Export start functions to window so they're accessible globally
window.startSolo = startSolo;
window.startVSBot = startVSBot;



requestAnimationFrame(gameLoop);
