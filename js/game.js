// --- Config ---
const BLOCKSIZE = 56;               // px
const NUMBLOCKS_X = 10;             // classic width
const NUMBLOCKS_Y = 20;             // classic height
const MOVEMENT_LAG = 85;            // ms (soft key repeat)
const INITIAL_FALL_DELAY = 600;     // ms

// 7 tetrominoes, rotation around a center cell
const BLOCKS_PER_TETROMINO = 4;
const N_BLOCK_TYPES = 11; // 7 originales + 4 añadidos por nosotros

// Color de las piezas
const PIECE_COLORS = [0xFF5733,  0x33FF57, 0x3357FF, 0xF333FF, 0xFFBD33, 0x33FFF3, 0x8D33FF,
  0xFF66AA,  0x66AAFF, 0xAAFF66, 0xDD44FF //ültimos 4 colores de piezas nuevas
];

// Scene grid values
const EMPTY = 0;
const FALLING = 1;
const OCCUPIED = 2;

//Preview canvas values
let previewCanvas = document.getElementById('previewCanvas');

//Si hay Canvas guardamos su contexto en previewctx, si no guardamos null
let previewCtx;

if(previewCanvas){
  previewCtx = previewCanvas.getContext('2d');
} else {
  previewCtx = null;
}


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
      2 : [[-2,0],[-1,0],[0,0],[1,0]],     // I
      3 : [[-1,-1],[0,-1],[0,0],[-1,0]],  // O
      4 : [[-1,0],[0,0],[0,-1],[1,-1]],   // S
      5 : [[-1,0],[0,0],[1,0],[0,1]],     // T
      6 : [[-1,-1],[0,-1],[0,0],[1,0]],    // Z

      7 : [[-1,0], [0,0], [1,0], [0,-1]], //Cruz extra [0,1]
      8 : [[0,-2], [0,-1], [0,0], [1,0]], // L Grande extra [2,0]
      9 : [[-1,-1],[0,-1],[0,0],[1,0]], // Escalera extra [2,2]
      10: [[-1,0],[0,0],[1,0],[-1,-1]] // U extra [1,-1]
    }
    this.extraBlockOffsets = {
      7: [0,1],     // Cruz
      8: [2,0],     // L grande
      9: [1,1],     // Escalera
      10: [1,-1]    // U
    };
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

  create(c_x, c_y, isPreview = false) { //Preview en false por defecto, solo se pone en true cuando necesites
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
      if(!isPreview){
        if (!this.tetris.validateCoordinates(x,y)) {
          conflict = true;
        } else {
          this.tetris.scene[x][y] = FALLING;
        }
      }
    }
    // --- BLOQUE EXTRA (5º BLOQUE) ---
  let extra = this.extraBlockOffsets[this.shape];
  if (extra) {
    let x = c_x + extra[0];
    let y = c_y + extra[1];

    let b = this.renderBlock();
    b.x = x * BLOCKSIZE;
    b.y = y * BLOCKSIZE;

    this.blocks.push(b);
    this.cells.push([x,y]);

    if (!isPreview) {
        this.tetris.scene[x][y] = FALLING;
    }
  }
    return conflict;
  }

  //Destruye un tetrómino (Necesario para la preview)
  destroyGraphics() {
    for (let i = 0; i < this.blocks.length; i++) {
        this.blocks[i].destroy(); 
    }
    this.blocks = [];
    this.cells = [];
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

  // Animación de choque (bump)
  bump(dir) {
    const offset = 8; // Píxeles que se desplaza en el choque
    const duration = 50; // Milisegundos que dura la ida

    let moveX = 0;
    let moveY = 0;

    if (dir === 'left') moveX = -offset;
    if (dir === 'right') moveX = offset;
    if (dir === 'down') moveY = offset;

    this.blocks.forEach(block => {
      // Si el bloque ya tiene un tween activo, no creamos otro para no acumularlos
      if (game.tweens.isTweening(block)) return;

      game.add.tween(block)
        .to({ x: block.x + moveX, y: block.y + moveY }, duration, Phaser.Easing.Back.Out, true, 0, 0, true);
    });
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

     //Comprobamos si se puede rotar en la nueva posición una vez desplazado el kick
  canRotateAt(offsetX, offsetY, dir){
    for(let i = 0; i < this.cells.length; i++){ //En cada celda del tetrómino
      let nuevaCoordenada = this.rotate(i, dir); //le pasamos a una variable el valor de la celda si rotara
      
      //Le aplicamos a sus coordenadas x e y el offset del wallkick
      let finalX = nuevaCoordenada[0] + offsetX; 
      let finalY = nuevaCoordenada[1] + offsetY;

      //Si no cabe aun así devolvemos false, si cabe devolvemos true
      if(!this.tetris.validateCoordinates(finalX, finalY)){
        return false;
      }

      //Comprueba si las celdas nuevas están ocupadas por otra pieza
      if (this.tetris.scene[finalX][finalY] === OCCUPIED) {
            return false;
        }
    }
    return true;
  }

  //Probamos si de todos los posibles wall kick hay alguno que permita rotar la pieza
  tryWallKick(dir){

    /*Los offsets que provocaría cada kick, por orden son:

    - Original (No se si es necesario)
    - Un bloque a la izquierda
    - Un bloque a la derecha
    - Dos bloques a la izquierda (Para la I)
    - Dos bloques a la derecha (Para la I)
    - Un bloque hacia arriba (Rotación al chocar con el suelo)    
    */

    const kicks =[[0, 0], [-1, 0], [1,0],[-2,0], [2,0], [0,-1]];
    const kicks_I = [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [3, 0], [0, -1]];

    let table;

    if (this.shape === 2) {
      // La pieza I usa sus propios wall kicks
      table = kicks_I;
    } else {
    // El resto de piezas usan los wall kicks normales
    table = kicks;
    }

    for (let i = 0; i< table.length; i++){

      //Comprueba si se puede rotar con las nuevas coordenadas x e y
      //Si se puede hace el wall kick y devuelve true
      //Si no devuelve false
      let offsetX = table[i][0];
      let offsetY = table[i][1];

    if (this.canRotateAt(offsetX, offsetY, dir)) {
      this.doWallKick(offsetX, offsetY, dir);
      return true;
    }
  }

  return false;
  }

  clearCurrentTetromino(){
    for(let i = 0; i<this.cells.length; i++){ 
      let antiguaX = this.cells[i][0];
      let antiguaY = this.cells[i][1];
      if (this.tetris.scene[antiguaX] && this.tetris.scene[antiguaX][antiguaY] === FALLING) {
      this.tetris.scene[antiguaX][antiguaY] = EMPTY;
    }
  }
}

  doWallKick(offsetX,offsetY,dir){

    // 1. Borrar la pieza actual del tablero
    this.clearCurrentTetromino();

    // 2. Rotar primero SIN mover el centro
    let rotated = [];
    for (let i = 0; i < this.cells.length; i++) {
        let r = this.rotate(i, dir); // rotación pura
        rotated.push([r[0], r[1]]);
    }

    // 3. Aplicar el offset del wall kick a TODAS las celdas
    for (let i = 0; i < rotated.length; i++) {
        rotated[i][0] += offsetX;
        rotated[i][1] += offsetY;
    }

    // 4. Actualizar el centro DESPUÉS de aplicar el offset
    this.center[0] += offsetX;
    this.center[1] += offsetY;

    // 5. Guardar y dibujar
    for (let i = 0; i < this.cells.length; i++) {
        let nx = rotated[i][0];
        let ny = rotated[i][1];

        this.cells[i][0] = nx;
        this.cells[i][1] = ny;

        this.blocks[i].x = nx * BLOCKSIZE;
        this.blocks[i].y = ny * BLOCKSIZE;

        this.tetris.scene[nx][ny] = FALLING;
    }
  }

  // Aplica el movimiento/rotación: actualiza celdas, posiciones gráficas y el estado del tablero.
  move(coordFn, centerFn, dir) {

    this.clearCurrentTetromino();

    for (let i = 0; i < this.cells.length; i++) {
      let nc = coordFn(i, dir);
      let nx = nc[0];
      let ny = nc[1];

      this.cells[i][0] = nx;
      this.cells[i][1] = ny;
      this.blocks[i].x = nx * BLOCKSIZE;
      this.blocks[i].y = ny * BLOCKSIZE;


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
  preload: preLoad,
  create: resetGame,
  update: updateGame
};

let bg;

let gameWidth  = NUMBLOCKS_X * BLOCKSIZE;
let gameHeight = NUMBLOCKS_Y * BLOCKSIZE;

let y_start = { 0:1, 1:1, 2:0, 3:1, 4:1, 5:0, 6:1, 7:1, 8:2, 9:2, 10:1};

let move_offsets = {
  left:  [-1,0],
  down:  [0,1],
  right: [1,0]
};

// Elements for the game
let tetromino, nextTetromino, theTetris;
let cursors, keyRotate, keyRestart, keyStop;
let gameOverState = false;

let timer, loop;
let currentMovementTimer = 0;
let shade, centerText;
let tetrominoCayendoSFX;

let isPaused=false;

let score = 0;
let linesCompleted = 0;

let timeLeft = null;
let timeInterval = null;

let isAnimating = false;

let playerName = "";

// Cargar assets
function preLoad(){
  //loading wav assets
  game.load.audio('test_sound', 'assets/sounds/flick.wav');
  // Load level config
  game.load.json('level1', '../level_1.json');
  game.load.json('level2', '../level_2.json');
  game.load.json('level3', '../level_3.json');
}

//Añadir nombre al inicio
document.addEventListener("DOMContentLoaded", () => {
  let nameSpan = document.getElementById("nameValue");
  playerName = "PlayerName";
  nameSpan.innerText = playerName;
  
  // Al hacer clic en el nombre, sale el prompt
  nameSpan.addEventListener("click", () => {
    let newName = prompt("Introduce tu nombre:", playerName);
    // Validar que el usuario no le dio a "Cancelar" (null) y que no dejó el texto vacío
    if (newName !== null && newName.trim() !== "") {
      playerName = newName.trim();
      nameSpan.innerText = playerName;
    }
  });
});

// Reinicia estado, tablero, HUD, input y temporizador para empezar una partida limpia.
function resetGame() {
  // clear all blocks
  game.world.removeAll();

  // Level config
  let levelConfig = game.cache.getJSON('level' + window.currentSelectedLevel).settings;
  let bgColor = levelConfig.gridColor

  // Tiempo límite del nivel
  if (levelConfig.timeLimit) {
  timeLeft = levelConfig.timeLimit;

  // Limpiar intervalos anteriores
  if (timeInterval) clearInterval(timeInterval);

  // Iniciar cuenta atrás
  timeInterval = setInterval(() => {
    timeLeft--;
    document.getElementById('timer').innerHTML = `Time: ${timeLeft}s`;

    if (timeLeft <= 0) {
      clearInterval(timeInterval);
      setGameOver(true);
    }
    }, 1000);
  }

  // Init level variables --
  score = 0;
  linesCompleted = 0;
  levelStartTime = game.time.now;
  speedIncreaseCounter = 0;

  // Add sound effects
  tetrominoCayendoSFX = game.add.audio('test_sound');

  // initialisation
  gameOverState = false;
  nextTetromino = null;
  currentMovementTimer = 0;

  // Create Trellis and initialisation of its grid
  theTetris = new Tetris();
  theTetris.initGrid();

  // subtle grid background
  bg = game.add.graphics(0,0);
  bg.beginFill(bgColor, 1);
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
  
  keyStop = game.input.keyboard.addKey(Phaser.Keyboard.P);

  keyStop.onDown.add(stopMenu, this);

  // timer
  // IMPORTANTE: si venimos de un game over, el Timer andará pausado.
  // Hay que reanudarlo explícitamente, o la caída se queda a 0 (no cae nunca).
  timer = game.time.events;
  timer.removeAll();
  timer.resume();

  // Cargar velocidad según level_config
  let speed = levelConfig ? levelConfig.speed : 600;
  loop = timer.loop(speed, fall, this);

  spawn();
};

// Tick de caída automática: intenta bajar la pieza, o la fija si ya no puede.
function fall() {
  if (gameOverState) return;
  if (tetromino.canMove(tetromino.slide.bind(tetromino),'down')) {
    tetrominoCayendoSFX.play();
    tetromino.move(tetromino.slide.bind(tetromino), tetromino.slideCenter.bind(tetromino), 'down');
  }
  else lockTetromino();
};


function drawNextTetromino(){

  if(!previewCtx) return;

  //Limpiamos el canvas
  previewCtx.clearRect(0,0,previewCanvas.width, previewCanvas.height);

  const shape = nextTetromino.shape;
  const color = nextTetromino.color;

  //Con el número de shape sacamos los offsets (Necesario para dibujar)
  const offsets = nextTetromino.offsets[shape]; 

  //Pasar el color de formato Phaser (0xRRGGBB) a CSS (#RRGGBB)
  const colorCSS = "#" + color.toString(16).padStart(6,'0')

  //Configuramos valores de dibujado
  previewCtx.fillStyle = colorCSS;
  previewCtx.strokeStyle = "#111"  
  previewCtx.lineWidth = 2;

   // Buscamos el mínimo X e Y de la pieza para centrarla
  let minX = Infinity;
  let minY = Infinity;

  for (let i = 0; i < BLOCKS_PER_TETROMINO; i++){
    if (offsets[i][0] < minX) minX = offsets[i][0];
    if (offsets[i][1] < minY) minY = offsets[i][1];
  }

  // También considerar el extra
  let extra = nextTetromino.extraBlockOffsets[shape];
  if (extra) {
    if (extra[0] < minX) minX = extra[0];
    if (extra[1] < minY) minY = extra[1];
  }

  // Ajustamos para que la pieza nunca tenga coordenadas negativas
  const offsetX = 1 - minX;
  const offsetY = 1 - minY;

  // Dibujar bloques base
  for (let i = 0; i < BLOCKS_PER_TETROMINO; i++){
    let x = (offsets[i][0] + offsetX) * BLOCKSIZE;
    let y = (offsets[i][1] + offsetY) * BLOCKSIZE;

    previewCtx.fillRect(x, y, BLOCKSIZE, BLOCKSIZE);
    previewCtx.strokeRect(x, y, BLOCKSIZE, BLOCKSIZE);
  }

  // Dibujar bloque extra
  if (extra) {
    let x = (extra[0] + offsetX) * BLOCKSIZE;
    let y = (extra[1] + offsetY) * BLOCKSIZE;

    previewCtx.fillRect(x, y, BLOCKSIZE, BLOCKSIZE);
    previewCtx.strokeRect(x, y, BLOCKSIZE, BLOCKSIZE);
  }

}


// Crea una nueva pieza en la parte superior; si colisiona al aparecer, termina la partida.
function spawn() {

  if(!nextTetromino){ //Si no hay tetrómino siguiente, inicializamos uno

  // Leemos la config del nivel actual
  let levelConfig = game.cache.getJSON('level' + window.currentSelectedLevel).settings;

  // Si el JSON tiene allowedPieces, usamos eso; si no, usamos las 7 clásicas
  let allowed = levelConfig.allowedPieces || [0,1,2,3,4,5,6];

  let shape = allowed[Math.floor(Math.random() * allowed.length)];
  let color = PIECE_COLORS[shape];

  nextTetromino = new Tetromino(shape, color, theTetris);
  }

  nextTetromino.destroyGraphics(); //Borras el gráfico de preview actual

  tetromino = nextTetromino; //El nuevo tetrómino será el siguiente


  let start_x = Math.floor(NUMBLOCKS_X/2);
  let start_y = y_start[tetromino.shape];
  let conflict = tetromino.create(start_x, start_y);
  if (conflict) setGameOver(true);

  //Creamos el nuevo tetrómino siguiente
  let levelConfig = game.cache.getJSON('level' + window.currentSelectedLevel).settings;
  let allowed = levelConfig.allowedPieces || [0,1,2,3,4,5,6];

  let nextShape = allowed[Math.floor(Math.random() * allowed.length)];
  let nextColor = PIECE_COLORS[nextShape];

  nextTetromino = new Tetromino(nextShape, nextColor, theTetris);

  drawNextTetromino();
};



// Activa el estado de fin de partida y muestra un mensaje de reinicio.
function setGameOver(on) {
  if (timeInterval) clearInterval(timeInterval);
    gameOverState = on;
    if (gameOverState) {
        timer.pause();
        makeShade(0.75);
        gameOverSelection = 0;
        gameOverTexts = [];

        let title = game.add.text(game.world.centerX, game.world.centerY - 100, 'GAME OVER', 
            { font: 'bold 40px Arial', fill: '#ff0000' });
        title.anchor.set(0.5);

        const options = ['Reiniciar Nivel', 'Volver al Menu', 'Hall of fame'];
        options.forEach((opt, i) => {
            let txt = game.add.text(game.world.centerX, game.world.centerY + (i * 60), opt, 
                { font: 'bold 28px Arial', fill: '#ffffff' });
            txt.anchor.set(0.5);
            gameOverTexts.push(txt);
        });

        updateGameOverUI();
    }
}

function updateGameOverUI() {
    gameOverTexts.forEach((txt, i) => {
        txt.fill = (i === gameOverSelection) ? "#444444" : "#ffffff";
        txt.text = (i === gameOverSelection) ? `> ${txt.text.replace(/> | </g, '')} <` : txt.text.replace(/> | </g, '');
    });
}

// Dibuja un velo oscuro encima del tablero para estados como 'game over'.
function makeShade(alpha){
  shade = game.add.graphics(0,0);
  shade.beginFill(0x000000, alpha);
  shade.drawRect(0, 0, gameWidth, gameHeight);
  shade.endFill();
};

function stopMenu(){

  if (!game.paused) {
    makeShade(0.5);
    centerText = game.add.text(game.world.centerX, game.world.centerY,
      'PAUSED\n\nPress P to continue', {
        font: 'bold 32px system-ui, -apple-system, Segoe UI, Roboto, Arial',
        fill: '#ffffff',
        align: 'center'
      }
    );
    centerText.anchor.set(0.5);
    //Añadir game over
  } else {
    shade.destroy();
    centerText.destroy();
  }
    game.paused = !game.paused;
}


// Bucle de actualización para leer input y mover la pieza
function updateGame() {

  if (isAnimating) return;

  if (keyStop.isDown) {
    stopMenu();
  }

  currentMovementTimer += this.time.elapsed;
  if (currentMovementTimer <= MOVEMENT_LAG) return;

  //Game Over
  if (gameOverState) {

    if (cursors.up.justDown) {
      gameOverSelection = (gameOverSelection - 1 + 3) % 3;
      updateGameOverUI();
    } 
    else if (cursors.down.justDown) {
      gameOverSelection = (gameOverSelection + 1) % 3;
      updateGameOverUI();
    }

    if (enterKey.justDown) {
      switch (gameOverSelection) {
        case 0: resetGame(); break;
        case 1: game.state.start('LevelMenu'); break;
        case 2: game.state.start('HofMenu'); break;
      }
    }

    return;
  }

  //Movement
  if (cursors.left.isDown) {
  if (tetromino.canMove(tetromino.slide.bind(tetromino), 'left')) {
      tetromino.move(tetromino.slide.bind(tetromino), tetromino.slideCenter.bind(tetromino), 'left');
    } else if (cursors.left.justDown) { // Solo hace el "bump" al pulsar una vez, para no saturar
      tetromino.bump('left');
    }
  }
  else if (cursors.right.isDown) {
    if (tetromino.canMove(tetromino.slide.bind(tetromino), 'right')) {
      tetromino.move(tetromino.slide.bind(tetromino), tetromino.slideCenter.bind(tetromino), 'right');
    } else if (cursors.right.justDown) {
      tetromino.bump('right');
    }
  }
  else if (cursors.down.isDown && tetromino.canMove(tetromino.slide.bind(tetromino), 'down')) {
    tetromino.move(tetromino.slide.bind(tetromino), tetromino.slideCenter.bind(tetromino), 'down');
  }
  else if (keyRotate.justDown) {

    // La O no rota
    if (tetromino.shape === 3) {
      currentMovementTimer = 0;
      return;
    }

    // Rotación normal
    if (tetromino.canMove(tetromino.rotate.bind(tetromino), 'clockwise')) {
      tetromino.move(tetromino.rotate.bind(tetromino), null, 'clockwise');
    }
    // Wall kick
    else {
      tetromino.tryWallKick('clockwise');
    }
  }

  currentMovementTimer = 0;
}


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
  let linesToClear = [];

  for (let i = 0; i < candidateLines.length; i++) {
    let y = candidateLines[i];
    if (lineSum(y) === (NUMBLOCKS_X * OCCUPIED)) {
      linesToClear.push(y);
    }
  }

  if (linesToClear.length > 0) {
    isAnimating = true; // Bloqueamos la entrada del usuario
    loop.timer.pause(); // Pausamos la caída de piezas
    
    animateLineBlink(linesToClear, () => {
      linesToClear.forEach(y => {
        cleanLine(y);
        score += 20;
        linesCompleted += 1;
      });

      document.getElementById('score').innerHTML = `Score: ${score}`;
      document.getElementById('lines').innerHTML = `Lines: ${linesCompleted}`;

      collapse(linesToClear);
      checkLevelGoal();
      
      isAnimating = false; // Desbloqueamos
      loop.timer.resume(); // Reanudamos el tiempo justo donde estaba
    });
  }
}

function animateLineBlink(lines, onComplete) {
  let lastTween = null;

  lines.forEach(y => {
    for (let x = 0; x < NUMBLOCKS_X; x++) {
      let block = theTetris.sceneBlocks[x][y];
      if (block) {
        // Creamos un parpadeo: alfa 1 -> 0 -> 1 -> 0
        lastTween = game.add.tween(block)
          .to({ alpha: 0 }, 100, Phaser.Easing.Linear.None, true, 0, 2, true);
      }
    }
  });

  // Cuando el último parpadeo termine, llamamos al callback para borrar los bloques
  if (lastTween) {
    lastTween.onComplete.add(onComplete, this);
  } else {
    onComplete();
  }
}

// Objetivos de victoria de cada nivel
function checkLevelGoal() {
  let cfg = game.cache.getJSON('level' + window.currentSelectedLevel).settings;

  // NIVEL 1: Objetivo por puntuación
  if (cfg.goal === "reachScore") {
    if (score >= cfg.scoreRequired) {
      levelComplete();
    }
  }

  // NIVEL 2: Velocidad dinámica (solo cambia velocidad, no termina)
  if (cfg.goal === "maxScoreWithSpeedUp") {
    // Aquí luego añadiremos la subida de velocidad
  }

  // NIVEL 3: límite de tiempo (lo haremos luego)
  if (cfg.goal === "maxScoreInTime") {
    if (score >= cfg.scoreRequired) {
        levelComplete();
    }
  }
}

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
