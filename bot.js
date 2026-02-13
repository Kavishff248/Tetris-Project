// --- SUPER FAST BOT SETTINGS ---
BOT_MOVE_INTERVAL = 0;
BOT_DROP_INTERVAL = 0;

function evaluateBoardHeuristic(board, linesCleared) {
  let aggregateHeight = 0;
  let holes = 0;
  let bumpiness = 0;
  let maxHeight = 0;

  const heights = new Array(COLS).fill(0);

  for (let x = 0; x < COLS; x++) {
    let y = 0;
    while (y < ROWS && !board[y][x]) y++;
    heights[x] = ROWS - y;
    aggregateHeight += heights[x];
    if (heights[x] > maxHeight) maxHeight = heights[x];
    for (let yy = y + 1; yy < ROWS; yy++) {
      if (!board[yy][x]) holes++;
    }
  }

  for (let x = 0; x < COLS - 1; x++) {
    bumpiness += Math.abs(heights[x] - heights[x + 1]);
  }

  let wellDepth = 0;
  for (let x = 0; x < COLS; x++) {
    const left = x === 0 ? heights[x + 1] : heights[x - 1];
    const right = x === COLS - 1 ? heights[x - 1] : heights[x + 1];
    const neighborMin = Math.min(left, right);
    if (neighborMin - heights[x] >= 2) {
      wellDepth += neighborMin - heights[x];
    }
  }

  const danger = maxHeight / (ROWS - 2);

  let lineScore = 0;
  let wellBonus = 0;

  if (wellDepth > 0) {
    if (danger < 0.4) wellBonus = -0.9 * wellDepth;
    else if (danger < 0.7) wellBonus = -0.5 * wellDepth;
    else wellBonus = -0.2 * wellDepth;
  }

  const aggressionFactor = BOT_AGGRESSION;
  if (danger < 0.4) {
    if (linesCleared === 4) lineScore = -45 * aggressionFactor;
    else if (linesCleared === 3) lineScore = -10 * aggressionFactor;
    else if (linesCleared <= 2) lineScore = +8 * (1 - aggressionFactor);
  } else if (danger < 0.7) {
    lineScore = -10 * linesCleared * aggressionFactor;
  } else {
    lineScore = -18 * linesCleared;
  }

  let score;
  if (danger < 0.4) {
    score =
      aggregateHeight * 0.4 +
      holes * BOT_HOLE_PENALTY +
      bumpiness * 0.8 +
      maxHeight * 1.0 +
      lineScore +
      wellBonus;
  } else if (danger < 0.7) {
    score =
      aggregateHeight * 0.8 +
      holes * BOT_HOLE_PENALTY +
      bumpiness * 0.6 +
      maxHeight * 1.5 +
      lineScore +
      wellBonus;
  } else {
    score =
      aggregateHeight * 1.3 +
      holes * BOT_HOLE_PENALTY +
      bumpiness * 0.3 +
      maxHeight * 2.2 +
      lineScore +
      wellBonus;
  }

  return score;
}

// --- Lookahead evaluation (upgraded bot) ---
const LOOKAHEAD_MAX = 3;

function evaluateBoard(board, linesCleared, combo = 0, tSpin = false) {
  let aggregateHeight = 0, holes = 0, bumpiness = 0, maxHeight = 0;
  const heights = new Array(COLS).fill(0);

  for (let x = 0; x < COLS; x++) {
    let y = 0;
    while (y < ROWS && !board[y][x]) y++;
    heights[x] = ROWS - y;
    aggregateHeight += heights[x];
    if (heights[x] > maxHeight) maxHeight = heights[x];
    for (let yy = y + 1; yy < ROWS; yy++) if (!board[yy][x]) holes++;
  }

  for (let x = 0; x < COLS - 1; x++) bumpiness += Math.abs(heights[x] - heights[x + 1]);

  let score = aggregateHeight * 0.5 + holes * 5 + bumpiness * 0.7 + maxHeight * 1.5;
  if (linesCleared > 0) score -= linesCleared * 20;
  if (combo > 0) score -= combo * 40;
  if (tSpin) score -= 80;

  return score;
}

function cloneBoard(board) { return cloneBoardState(board); }

function simulateDrop(board, type, rot, startX) {
  let x = startX, y = 0;
  if (!canPlaceOnRawBoard(board, type, rot, x, y)) return null;
  while (canPlaceOnRawBoard(board, type, rot, x, y + 1)) y++;
  const temp = cloneBoard(board);
  mergePieceIntoBoard(temp, type, rot, x, y);
  const { board: clearedBoard, linesCleared } = clearLinesOnRawBoard(temp);
  return { board: clearedBoard, x, rot, linesCleared };
}

function simulateNext(board, pieces, depth = 0, combo = 0) {
  if (depth >= pieces.length) return evaluateBoard(board, 0, combo);
  const type = pieces[depth];
  let bestScore = Infinity;
  for (let rot = 0; rot < 4; rot++) {
    for (let x = -4; x < COLS + 4; x++) {
      const sim = simulateDrop(board, type, rot, x);
      if (!sim) continue;
      const nextCombo = sim.linesCleared > 0 ? combo + 1 : 0;
      const score = simulateNext(sim.board, pieces, depth + 1, nextCombo);
      if (score < bestScore) bestScore = score;
    }
  }
  return bestScore;
}

function cloneBoardState(board) {
  return board.map(row => row.slice());
}

function canPlaceOnRawBoard(board, type, rot, px, py) {
  const shape = TETROMINOES[type].shapes[((rot % 4) + 4) % 4];
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      const bx = px + x;
      const by = py + y;
      if (bx < 0 || bx >= COLS || by >= ROWS) return false;
      if (by >= 0 && board[by][bx]) return false;
    }
  }
  return true;
}

function mergePieceIntoBoard(board, type, rot, px, py) {
  const shape = TETROMINOES[type].shapes[((rot % 4) + 4) % 4];
  const color = getPieceColor(type);
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      const bx = px + x;
      const by = py + y;
      if (by < 0) continue;
      board[by][bx] = { type, color };
    }
  }
}

function clearLinesOnRawBoard(board) {
  let linesCleared = 0;
  const newBoard = [];
  for (let r = 0; r < ROWS; r++) {
    if (board[r].every(cell => cell)) {
      linesCleared++;
    } else {
      newBoard.push(board[r]);
    }
  }
  while (newBoard.length < ROWS) {
    newBoard.unshift(new Array(COLS).fill(null));
  }
  return { board: newBoard, linesCleared };
}

function simulateDropOnBoard(board, type, rot, startX) {
  let x = startX;
  let y = 0;

  if (!canPlaceOnRawBoard(board, type, rot, x, y)) {
    return null;
  }

  while (canPlaceOnRawBoard(board, type, rot, x, y + 1)) {
    y++;
  }

  const temp = cloneBoardState(board);
  mergePieceIntoBoard(temp, type, rot, x, y);
  const { board: clearedBoard, linesCleared } = clearLinesOnRawBoard(temp);

  const score = evaluateBoardHeuristic(clearedBoard, linesCleared);

  return { x, rot, score };
}

function botChooseTarget(pState) {
  const type = pState.piece;
  if (!type) return null;

  const params = pState._botParams || {};
  const depth = Math.min(LOOKAHEAD_MAX, Math.max(1, params.depth || 1));

  const pieces = [type];
  for (let i = 0; i < depth - 1; i++) {
    const next = (pState.queue && pState.queue[i]) || null;
    if (next) pieces.push(next);
  }

  let bestMove = null, bestScore = Infinity;

  for (let rot = 0; rot < 4; rot++) {
    for (let x = -4; x < COLS + 4; x++) {
      const sim = simulateDrop(pState.board, type, rot, x);
      if (!sim) continue;
      const lookPieces = pieces.slice(1);
      const score = simulateNext(sim.board, lookPieces, 0, 0);
      if (score < bestScore) {
        bestScore = score;
        bestMove = { x: sim.x, rot, usedHold: false };
      }
    }
  }

  if (pState.canHold && pState.hold) {
    const holdType = pState.hold;
    for (let rot = 0; rot < 4; rot++) {
      for (let x = -4; x < COLS + 4; x++) {
        const sim = simulateDrop(pState.board, holdType, rot, x);
        if (!sim) continue;
        const lookPieces = pieces.slice(1);
        const score = simulateNext(sim.board, lookPieces, 0, 0);
        if (score < bestScore) {
          bestScore = score;
          bestMove = { x: sim.x, rot, usedHold: true, heldType: holdType };
        }
      }
    }
  }

  if (!bestMove) return null;

  const accuracy = Math.min(1, Math.max(0, params.placementAccuracy ?? BOT_PLACEMENT_ACCURACY));
  if (Math.random() <= accuracy) return bestMove;

  const candidates = [];
  for (let rot = 0; rot < 4; rot++) {
    for (let x = -4; x < COLS + 4; x++) {
      const sim = simulateDrop(pState.board, type, rot, x);
      if (!sim) continue;
      const score = simulateNext(sim.board, pieces.slice(1), 0, 0);
      candidates.push({ x: sim.x, rot, score, usedHold: false });
    }
  }
  if (pState.canHold && pState.hold) {
    for (let rot = 0; rot < 4; rot++) {
      for (let x = -4; x < COLS + 4; x++) {
        const sim = simulateDrop(pState.board, pState.hold, rot, x);
        if (!sim) continue;
        const score = simulateNext(sim.board, pieces.slice(1), 0, 0);
        candidates.push({ x: sim.x, rot, score, usedHold: true });
      }
    }
  }
  candidates.sort((a, b) => a.score - b.score);
  const topN = Math.max(1, Math.min(6, Math.floor(candidates.length * 0.2) || 1));
  const idx = 1 + Math.floor(Math.random() * topN);
  const pick = candidates[Math.min(idx, candidates.length - 1)];
  return { x: pick.x, rot: pick.rot, usedHold: pick.usedHold };
}

function updateBotPlayer(pState, now) {
  if (!pState.alive) return;
  if (!pState.piece) spawnPiece(pState);

  if (pState.garbageQueue > 0) {
    applyGarbage(pState);
  }

  if (
    !pState._target ||
    pState._targetPiece !== pState.piece ||
    Math.random() < BOT_RETHINK_CHANCE
  ) {
    const level = Math.max(1, pState.level || 1);
    const levelFactor = Math.pow(0.96, Math.max(0, level - 1));

    // SUPER FAST BOT: removed speed cap
    const moveInterval = BOT_MOVE_INTERVAL * levelFactor;
    const dropInterval = BOT_DROP_INTERVAL * levelFactor;

    const placementAccuracy = Math.min(1, BOT_PLACEMENT_ACCURACY + 0.015 * (level - 1));
    const aggression = Math.min(1, BOT_AGGRESSION + 0.01 * (level - 1));
    const rethinkChance = Math.max(0.01, BOT_RETHINK_CHANCE * Math.pow(0.98, Math.max(0, level - 1)));
    const depth = Math.min(LOOKAHEAD_MAX, 1 + botDifficulty + Math.floor((level - 1) / 10));

    pState._botParams = {
      moveInterval,
      dropInterval,
      placementAccuracy,
      aggression,
      rethinkChance,
      depth
    };
    pState._target = botChooseTarget(pState);
    pState._targetPiece = pState.piece;
  }

  if (!pState._target) {
    if (canPlace(pState, pState.pieceX, pState.pieceY + 1, pState.rotation)) {
      pState.pieceY += 1;
    } else {
      lockPiece(pState);
      pState._target = null;
      pState._targetPiece = null;
    }
    return;
  }

  if (typeof pState._nextMove !== "number" || isNaN(pState._nextMove)) pState._nextMove = now;
  if (typeof pState._nextDrop !== "number" || isNaN(pState._nextDrop)) pState._nextDrop = now;

  const moveInterval = (pState._botParams && pState._botParams.moveInterval) || BOT_MOVE_INTERVAL;
  if (now >= pState._nextMove) {
    if (pState.rotation !== pState._target.rot) {
      const dir = (pState._target.rot - pState.rotation + 4) % 4 <= 2 ? 1 : -1;
      rotate(pState, dir);
    } else if (pState.pieceX < pState._target.x) {
      moveHoriz(pState, 1);
    } else if (pState.pieceX > pState._target.x) {
      moveHoriz(pState, -1);
    }
    pState._nextMove = now + moveInterval * 1000;
  }

  if (
    pState.pieceX === pState._target.x &&
    pState.rotation === pState._target.rot
  ) {
    const dy = hardDropDistance(pState);
    pState.pieceY += dy;
    lockPiece(pState);
    pState._target = null;
    pState._targetPiece = null;
    return;
  }

  const dropInterval = (pState._botParams && pState._botParams.dropInterval) || BOT_DROP_INTERVAL;
  if (now >= pState._nextDrop) {
    if (canPlace(pState, pState.pieceX, pState.pieceY + 1, pState.rotation)) {
      pState.pieceY++;
    } else {
      lockPiece(pState);
      pState._target = null;
      pState._targetPiece = null;
    }
    pState._nextDrop = now + dropInterval * 1000;
  }
}

window.botChooseTarget = botChooseTarget;
window.updateBotPlayer = updateBotPlayer;
