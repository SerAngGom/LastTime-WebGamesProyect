// --- Config ---
const BLOCKSIZE = 28;               // px
const NUMBLOCKS_X = 10;             // classic width
const NUMBLOCKS_Y = 20;             // classic height
const MOVEMENT_LAG = 85;            // ms (soft key repeat)
const INITIAL_FALL_DELAY = 600;     // ms

// 7 tetrominoes, rotation around a center cell
const BLOCKS_PER_TETROMINO = 4;
const N_BLOCK_TYPES = 7;

// Color de las piezas: blanco
const PIECE_COLOR = 0xFFFFFF;

// Scene grid values
const EMPTY = 0;
const FALLING = 1;
const OCCUPIED = 2;

class Tetris {
  constructor() {
    this.scene = [];
    this.sceneBlocks = [];
  }

  // Inicializa la matriz lógica del tablero y la matriz de referencias a bloques ya fijados.
  initGrid() {
    for (let x = 0; x < NUMBLOCKS_X; x++) {
      let col = [];
      let colBlocks = [];
      for (let y = 0; y < NUMBLOCKS_Y; y++) {
        col.push(EMPTY);
        colBlocks.push(null);
      }
      this.scene.push(col);
      this.sceneBlocks.push(colBlocks);
    }
  }

  // Comprueba si una celda está dentro del tablero y no está ocupada por bloques ya fijados.
  validateCoordinates(x, y) {
    if (x < 0 || x >= NUMBLOCKS_X) return false;
    if (y < 0 || y >= NUMBLOCKS_Y) return false;
    if (this.scene[x][y] === OCCUPIED) return false;
    return true;
  }
};

class Tetromino {
  constructor(shape, color, tetris) {
    this.shape = shape;
    this.color = color;
    this.tetris = tetris;
    this.center = [0, 0];
    this.blocks = [];
    this.cells = [];
    // The positions of each block of a tetromino with respect to its center (cell coords)
    this.offsets = {
      0 : [[0,-1],[0,0],[0,1],[1,1]],     // L
      1 : [[0,-1],[0,0],[0,1],[-1,1]],    // J
      2 : [[-1,0],[0,0],[1,0],[2,0]],     // I
      3 : [[-1,-1],[0,-1],[0,0],[-1,0]],  // O
      4 : [[-1,0],[0,0],[0,-1],[1,-1]],   // S
      5 : [[-1,0],[0,0],[1,0],[0,1]],     // T
      6 : [[-1,-1],[0,-1],[0,0],[1,0]]    // Z
    }
  }

  // Dibuja el bloque mediante Graphics de Phaser (sin sprites), con un pequeño margen
  // respecto a la rejilla.
  renderBlock() {
    let g = game.add.graphics(0,0);
    g.beginFill(this.color, 1);
    // tiny inset with regard to the grid
    let m = 1;
    g.drawRect(m, m, BLOCKSIZE - 2*m, BLOCKSIZE - 2*m);
    g.endFill();
    return g;
  }

  create(c_x, c_y) {
    this.center = [c_x, c_y];

    let conflict = false;
    for (let i = 0; i < BLOCKS_PER_TETROMINO; i++) {
      let x = c_x + this.offsets[this.shape][i][0];
      let y = c_y + this.offsets[this.shape][i][1];

      let b = this.renderBlock();
      b.x = x * BLOCKSIZE;
      b.y = y * BLOCKSIZE;

      this.blocks.push(b);
      this.cells.push([x,y]);
  
      if (!this.tetris.validateCoordinates(x,y)) {
        conflict = true;
      } else {
        this.tetris.scene[x][y] = FALLING;
      }
    }
    return conflict;
  }

  // Verifica si la pieza puede moverse/rotar sin salirse del tablero ni chocar con bloques ocupados.
  canMove(coordFn, dir) {
    if (gameOverState) return false;
    for(let i = 0; i < this.cells.length; i++) {
      let nc = coordFn(i, dir);
      if (!this.tetris.validateCoordinates(nc[0], nc[1])) return false;
    }
    return true;
  }

  // Calcula la nueva coordenada de un bloque de la pieza al moverla en una dirección.
  slide(block, dir) {
    return [this.cells[block][0] + move_offsets[dir][0],
            this.cells[block][1] + move_offsets[dir][1]];
  }

  // Calcula la nueva coordenada de un bloque tras rotar alrededor del centro (rotación clásica).
  rotate(block, dir) {
    // classic rotation around center
    let c_x = this.center[0];
    let c_y = this.center[1];

    let ox = this.cells[block][0] - c_x;
    let oy = this.cells[block][1] - c_y;

    // adjust for screen coords
    oy = -oy;

    let nx = (dir === 'clockwise') ? oy : -oy;
    let ny = (dir === 'clockwise') ? -ox : ox;

    ny = -ny;

    return [c_x + nx, c_y + ny];
  }

  // Aplica el movimiento/rotación: actualiza celdas, posiciones gráficas y el estado del tablero.
  move(coordFn, centerFn, dir) {
    for (let i = 0; i < this.cells.length; i++) {
      let ox = this.cells[i][0];
      let oy = this.cells[i][1];
      let nc = coordFn(i, dir);
      let nx = nc[0];
      let ny = nc[1];

      this.cells[i][0] = nx;
      this.cells[i][1] = ny;
      this.blocks[i].x = nx * BLOCKSIZE;
      this.blocks[i].y = ny * BLOCKSIZE;

      this.tetris.scene[ox][oy] = EMPTY;
      this.tetris.scene[nx][ny] = FALLING;
    }
    if (centerFn) {
      let nc = centerFn(dir);
      this.center = [nc[0], nc[1]];
    }
  }

  // Calcula la nueva coordenada del centro de rotación al mover la pieza en una dirección.
  slideCenter(dir) {
    return [this.center[0] + move_offsets[dir][0],
            this.center[1] + move_offsets[dir][1]];
  }
};


let gameState = {
  create: resetGame,
  update: updateGame
};

let bg;

let gameWidth  = NUMBLOCKS_X * BLOCKSIZE;
let gameHeight = NUMBLOCKS_Y * BLOCKSIZE;

let y_start = { 0:1, 1:1, 2:0, 3:1, 4:1, 5:0, 6:1 };

let move_offsets = {
  left:  [-1,0],
  down:  [0,1],
  right: [1,0]
};

// Elements for the game
let tetromino, theTetris;
let cursors, keyRotate, keyRestart;
let gameOverState = false;

let timer, loop;
let currentMovementTimer = 0;
let shade, centerText;


// Reinicia estado, tablero, HUD, input y temporizador para empezar una partida limpia.
function resetGame() {
  // clear all blocks
  game.world.removeAll();

  // initialisation
  gameOverState = false;
  currentMovementTimer = 0;

  // Create Trellis and initialisation of its grid
  theTetris = new Tetris();
  theTetris.initGrid();

  // subtle grid background
  bg = game.add.graphics(0,0);
  bg.beginFill(0x0E0E0E, 1);
  bg.drawRect(0,0,gameWidth,gameHeight);
  bg.endFill();
  bg.lineStyle(1, 0x1B1B1B, 1);
  for (let x = 0; x < NUMBLOCKS_X; x++) {
    bg.moveTo(x*BLOCKSIZE, 0);
    bg.lineTo(x*BLOCKSIZE, gameHeight);
  };
  for (let y = 0; y < NUMBLOCKS_Y; y++) {
    bg.moveTo(0, y*BLOCKSIZE);
    bg.lineTo(gameWidth, y*BLOCKSIZE);
  };

  // input
  cursors = game.input.keyboard.createCursorKeys();
  keyRotate = game.input.keyboard.addKey(Phaser.Keyboard.UP);
  keyRestart = game.input.keyboard.addKey(Phaser.Keyboard.R);

  // timer
  // IMPORTANTE: si venimos de un game over, el Timer andará pausado.
  // Hay que reanudarlo explícitamente, o la caída se queda a 0 (no cae nunca).
  timer = game.time.events;
  timer.removeAll();
  timer.resume();
  loop = timer.loop(INITIAL_FALL_DELAY, fall, this);

  spawn();
};

// Tick de caída automática: intenta bajar la pieza, o la fija si ya no puede.
function fall() {
  if (gameOverState) return;
  if (tetromino.canMove(tetromino.slide.bind(tetromino),'down')) {
    tetromino.move(tetromino.slide.bind(tetromino), tetromino.slideCenter.bind(tetromino), 'down');
  }
  else lockTetromino();
};

// Crea una nueva pieza en la parte superior; si colisiona al aparecer, termina la partida.
function spawn() {
  let shape = Math.floor(Math.random() * N_BLOCK_TYPES);
  let color = PIECE_COLOR;

  tetromino = new Tetromino(shape, color, theTetris);

  let start_x = Math.floor(NUMBLOCKS_X/2);
  let start_y = y_start[tetromino.shape];
  let conflict = tetromino.create(start_x, start_y);
  if (conflict) setGameOver(true);
};

// Activa el estado de fin de partida y muestra un mensaje de reinicio.
function setGameOver(on){
  gameOverState = on;
  if (gameOverState) {
    timer.pause();
    makeShade(0.65);
    centerText = game.add.text(game.world.centerX, game.world.centerY,
      'GAME OVER\n\nPress R to restart', {
        font: 'bold 32px system-ui, -apple-system, Segoe UI, Roboto, Arial',
        fill: '#ffffff',
        align: 'center'
      }
    );
    centerText.anchor.set(0.5);
  }
};

// Dibuja un velo oscuro encima del tablero para estados como 'game over'.
function makeShade(alpha){
  shade = game.add.graphics(0,0);
  shade.beginFill(0x000000, alpha);
  shade.drawRect(0, 0, gameWidth, gameHeight);
  shade.endFill();
};

// Bucle de actualización para leer input y mover la pieza
function updateGame() {
  currentMovementTimer += this.time.elapsed;
  if (currentMovementTimer <= MOVEMENT_LAG) return;

  if (gameOverState) {
    if (keyRestart.isDown)
      resetGame();
    currentMovementTimer = 0;
    return;
  };

  if (cursors.left.isDown && tetromino.canMove(tetromino.slide.bind(tetromino), 'left')) {
    tetromino.move(tetromino.slide.bind(tetromino), tetromino.slideCenter.bind(tetromino), 'left');
  } else if (cursors.right.isDown && tetromino.canMove(tetromino.slide.bind(tetromino), 'right')) {
    tetromino.move(tetromino.slide.bind(tetromino), tetromino.slideCenter.bind(tetromino), 'right');
  } else if (cursors.down.isDown && tetromino.canMove(tetromino.slide.bind(tetromino), 'down')) {
    tetromino.move(tetromino.slide.bind(tetromino), tetromino.slideCenter.bind(tetromino), 'down');
  } else if (keyRotate.isDown) {
    // O piece rotation is pointless, but harmless
    if (tetromino.canMove(tetromino.rotate.bind(tetromino), 'clockwise'))
      tetromino.move(tetromino.rotate.bind(tetromino), null, 'clockwise');
  };

  currentMovementTimer = 0;
};

// Fija la pieza actual en el tablero, comprueba líneas completas y genera la siguiente.
function lockTetromino() {
  let touchedLines = [];
  for (let i = 0; i < tetromino.cells.length; i++) {
    let x = tetromino.cells[i][0];
    let y = tetromino.cells[i][1];

    theTetris.scene[x][y] = OCCUPIED;
    theTetris.sceneBlocks[x][y] = tetromino.blocks[i];

    if (touchedLines.indexOf(y) == -1)
      touchedLines.push(y);
  }
  checkLines(touchedLines);
  spawn();
};

// Revisa las filas tocadas por la pieza recién fijada y aplica limpieza/colapso/puntuación.
function checkLines(candidateLines) {
  let collapsed = [];
  for (let i = 0; i < candidateLines.length; i++) {
    let y = candidateLines[i];
    if (lineSum(y) == (NUMBLOCKS_X * OCCUPIED)) {
      collapsed.push(y);
      cleanLine(y);
    }
  }
  if (collapsed.length)
    collapse(collapsed);
};

// Suma el estado de una fila para detectar si está completamente ocupada.
function lineSum(y) {
  let s = 0;
  for (let x = 0; x < NUMBLOCKS_X; x++) 
    s += theTetris.scene[x][y];
  return s;
};

// Borra una fila: destruye los Graphics de esa fila y marca las celdas como vacías.
function cleanLine(y) {
  for (let x = 0; x < NUMBLOCKS_X; x++) {
    if (theTetris.sceneBlocks[x][y]) {
      theTetris.sceneBlocks[x][y].destroy();
      theTetris.sceneBlocks[x][y] = null;
    }
    theTetris.scene[x][y] = EMPTY;
  }
};

// Colapsa filas: baja todo lo que queda por encima de las líneas eliminadas.
function collapse(linesToCollapse) {
  // sort ascending so we collapse from bottom up
  linesToCollapse.sort(function (a, b) {
    return a - b;
  });
  for (let idx = 0; idx < linesToCollapse.length; idx++) {
    let y = linesToCollapse[idx];
    for (let yy = y; yy > 0; yy--) {
      for (let x = 0; x < NUMBLOCKS_X; x++) {
        // shift occupancy
        theTetris.scene[x][yy] = theTetris.scene[x][yy-1];
        theTetris.sceneBlocks[x][yy] = theTetris.sceneBlocks[x][yy-1];
        if (theTetris.sceneBlocks[x][yy])
          theTetris.sceneBlocks[x][yy].y = yy * BLOCKSIZE;
      }
    }
    // clear top line
    for (let x2 = 0; x2 < NUMBLOCKS_X; x2++) {
      theTetris.scene[x2][0] = EMPTY;
      theTetris.sceneBlocks[x2][0] = null;
    }
  }
};
