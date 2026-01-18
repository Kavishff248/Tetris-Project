

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

  // Adjust line score based on difficulty (aggression)
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

  let best = null;

  for (let rot = 0; rot < 4; rot++) {
    for (let x = -3; x < COLS + 3; x++) {
      const sim = simulateDropOnBoard(pState.board, type, rot, x);
      if (!sim) continue;
      
      // Apply placement accuracy: lower difficulty bots sometimes pick non-optimal moves
      if (Math.random() > BOT_PLACEMENT_ACCURACY) {
        // Occasionally pick a random placement instead of optimal
        if (!best) best = sim;
        continue;
      }
      
      if (!best || sim.score < best.score) {
        best = sim;
      }
    }
  }

  return best;
}

function updateBotPlayer(pState, now) {
  if (!pState.alive) return;
  if (!pState.piece) spawnPiece(pState);

  if (pState.garbageQueue > 0) {
    applyGarbage(pState);
  }

  // Re-think target occasionally
  if (
    !pState._target ||
    pState._targetPiece !== pState.piece ||
    Math.random() < BOT_RETHINK_CHANCE
  ) {
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

  // Safer initialization: treat undefined or non-number as uninitialized
  if (typeof pState._nextMove !== "number" || isNaN(pState._nextMove)) pState._nextMove = now;
  if (typeof pState._nextDrop !== "number" || isNaN(pState._nextDrop)) pState._nextDrop = now;

  if (now >= pState._nextMove) {
    if (pState.rotation !== pState._target.rot) {
      const dir = (pState._target.rot - pState.rotation + 4) % 4 <= 2 ? 1 : -1;
      rotate(pState, dir);
    } else if (pState.pieceX < pState._target.x) {
      moveHoriz(pState, 1);
    } else if (pState.pieceX > pState._target.x) {
      moveHoriz(pState, -1);
    }
    pState._nextMove = now + BOT_MOVE_INTERVAL * 1000;
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

  if (now >= pState._nextDrop) {
    if (canPlace(pState, pState.pieceX, pState.pieceY + 1, pState.rotation)) {
      pState.pieceY++;
    } else {
      lockPiece(pState);
      pState._target = null;
      pState._targetPiece = null;
    }
    pState._nextDrop = now + BOT_DROP_INTERVAL * 1000;
  }
}

// Expose bot functions
window.botChooseTarget = botChooseTarget;
window.updateBotPlayer = updateBotPlayer;
