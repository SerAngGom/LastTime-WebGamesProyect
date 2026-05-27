// Splash menu

let splashMenuState = {
  preload: loadSplashMenu,
  create:  createSplashMenu,
  update:  updateSplashMenu
};

let enterKey;

function loadSplashMenu(){
  game.load.image('splash', 'assets/images/splash.png');
};

function createSplashMenu(){
    let bg = game.add.image(0, 0, 'splash');
    bg.width = game.width;
    bg.height = game.height;

    let startText = game.add.text(
      game.world.centerX,
      game.world.centerY - 80, // -80 offset test NÚMERO MÁGICO
      'Press ENTER to START',
      {
        font: 'bold 32px system-ui, Arial',
        fill: '#ffffff'
      }
    );
    startText.anchor.set(0.5);

    let creditsText = game.add.text(
      game.world.centerX,
      game.height - 40, // -100 offset test NÚMERO MÁGICO
      'Francisco Campra Bautista\nSergio Angulo Gómez\nÁlvaro Ramos Marco',
      {
        font: '18px Arial',
        fill: '#ffffff',
        align: 'center',
        lineSpacing: 10
      }
    );
    creditsText.anchor.set(0.5);

    enterKey = game.input.keyboard.addKey(Phaser.Keyboard.ENTER);
};

function updateSplashMenu(){
  if (enterKey.justDown) {
      game.state.start('LevelMenu');
    }
};

// Level menu

let levelMenuState = {
  create: createLevelMenu,
  update: updateLevelMenu
};

let selectedLevel = 0;
let levelTexts = [];
let upKey, downKey;

function createLevelMenu(){
  
  // En lugar de selectedLevel = 0 fija siempre, inicializa basándote en el nivel actual menos 1
  selectedLevel = (window.currentSelectedLevel) ? (window.currentSelectedLevel - 1) : 0;
  
  // Por seguridad, si el cursor quedara en un nivel bloqueado, lo devolvemos al nivel 1 (0)
  if ((selectedLevel + 1) > window.maxLevelUnlocked) {
    selectedLevel = 0;
  }

  levelTexts = [];

  // Definimos los nombres base de los niveles
  const levels = ['Nivel 1', 'Nivel 2', 'Nivel 3'];
  const style = { font: 'bold 32px system-ui, Arial', fill: '#ffffff' };

  for(let i = 0; i < levels.length; i++){
    // Si el nivel está por encima del máximo desbloqueado, le ponemos un candado
    let textToShow = levels[i];
    if ((i + 1) > window.maxLevelUnlocked) {
      textToShow += " 🔒";
    }

    let txt = game.add.text(game.world.centerX, game.world.centerY - 80 + (i * 60), textToShow, style);
    txt.anchor.set(0.5);
    levelTexts.push(txt);
  }

  upKey = game.input.keyboard.addKey(Phaser.Keyboard.UP);
  downKey = game.input.keyboard.addKey(Phaser.Keyboard.DOWN);
  enterKey = game.input.keyboard.addKey(Phaser.Keyboard.ENTER);

  updateTextSelection();
};

function updateLevelMenu(){
  if (upKey.justDown) {
    // Código para subir en el menú...
    do {
      selectedLevel = (selectedLevel > 0) ? selectedLevel - 1 : 2;
    } while ((selectedLevel + 1) > window.maxLevelUnlocked);
    updateTextSelection();
  }

  if (downKey.justDown) {
    // Código para bajar en el menú...
    selectedLevel = (selectedLevel < 2) ? selectedLevel + 1 : 0;
    if ((selectedLevel + 1) > window.maxLevelUnlocked) {
      selectedLevel = 0;
    }
    updateTextSelection();
  }

  if (enterKey.justDown) {
    // SOLUCIÓN AQUÍ: Sincronizar el nivel elegido antes de ir a las instrucciones
    window.currentSelectedLevel = selectedLevel + 1; 
    game.state.start('InstructionMenu');
  }
}

function updateTextSelection(){
  for(let i = 0; i < levelTexts.length; i++){
    if(i === selectedLevel){
      levelTexts[i].fill = '#ff0000';
    } else {
      // Si está bloqueado lo pintamos más oscuro, si no, blanco
      levelTexts[i].fill = ((i + 1) > window.maxLevelUnlocked) ? '#444444' : '#ffffff';
    }
  }
};

let unlockMenuState = {
  create: createUnlockMenu,
  update: updateUnlockMenu
};

let unlockSelection = 0;
let unlockTexts = [];

function createUnlockMenu() {
  unlockSelection = 0;
  unlockTexts = [];
  
  // Fondo oscuro limpio para el menú
  game.stage.backgroundColor = "#0A0A1A";

  // Determinar qué nivel se acaba de desbloquear basado en el nivel que jugábamos
  let nextLevel = window.currentSelectedLevel + 1;
  let titleStr = "¡Nivel " + nextLevel + " desbloqueado!";

  // Título de desbloqueo
  let titleText = game.add.text(game.world.centerX, game.world.centerY - 100, titleStr, {
    font: 'bold 36px system-ui, Arial',
    fill: '#00FF66',
    align: 'center'
  });
  titleText.anchor.set(0.5);

  // Opciones del menú interactivo
  const options = ['Continuar', 'Volver al menu'];
  const styleOptions = { font: 'bold 28px system-ui, Arial', fill: '#ffffff' };

  options.forEach((opt, i) => {
    let txt = game.add.text(game.world.centerX, game.world.centerY + 20 + (i * 60), opt, styleOptions);
    txt.anchor.set(0.5);
    unlockTexts.push(txt);
  });

  // Teclas de control
  upKey = game.input.keyboard.addKey(Phaser.Keyboard.UP);
  downKey = game.input.keyboard.addKey(Phaser.Keyboard.DOWN);
  enterKey = game.input.keyboard.addKey(Phaser.Keyboard.ENTER);

  updateUnlockSelectionUI();
}

function updateUnlockMenu() {
  if (upKey.justDown || downKey.justDown) {
    // Alternar de forma binaria entre la opción 0 y 1
    unlockSelection = unlockSelection === 0 ? 1 : 0;
    updateUnlockSelectionUI();
  }

  if (enterKey.justDown) {
    if (unlockSelection === 0) {
      window.currentSelectedLevel += 1;
      
      // REGISTRO DE DESBLOQUEO: Si el nuevo nivel es mayor al récord actual, se actualiza
      if (window.currentSelectedLevel > window.maxLevelUnlocked) {
        window.maxLevelUnlocked = window.currentSelectedLevel;
      }
      
      game.state.start('InstructionMenu');
    } else {
      game.state.start('LevelMenu');
    }
  }
}

function updateUnlockSelectionUI() {
  unlockTexts.forEach((txt, index) => {
    if (index === unlockSelection) {
      txt.fill = "#ffffff";
      txt.text = "> " + (index === 0 ? "Continuar" : "Volver al menu") + " <";
    } else {
      txt.fill = "#444444";
      txt.text = index === 0 ? "Continuar" : "Volver al menu";
    }
  });
}

let instructionMenuState = {
  preload: loadInstructionMenu,
  create: createInstructionMenu,
  update: updateInstructionMenu
};

function loadInstructionMenu(){
  // Cargamos los JSON aquí para que estén disponibles en las instrucciones
  game.load.json('level1', 'level_1.json');
  game.load.json('level2', 'level_2.json');
  game.load.json('level3', 'level_3.json');
};

function createInstructionMenu() {
  // Fondo oscuro que combine con la estética del juego
  game.stage.backgroundColor = "#0D0D1A";

  // 1. Obtener la configuración del nivel actual desde la caché de Phaser
  let levelConfig = game.cache.getJSON('level' + window.currentSelectedLevel).settings;
  // Fallback por si algún JSON no tiene el campo definido
  let textInstructions = levelConfig.instructions || "Prepárate para jugar.";

  // 2. Título de la pantalla
  let titleText = game.add.text(game.world.centerX, 80, "INSTRUCCIONES", {
    font: 'bold 36px system-ui, Arial',
    fill: '#FFCC00',
    align: 'center'
  });
  titleText.anchor.set(0.5);

  // 3. Bloque de texto de las instrucciones (con ajuste de línea automático para que no se salga)
  let instructionsDisplay = game.add.text(game.world.centerX, game.world.centerY - 20, textInstructions, {
    font: '20px system-ui, Arial',
    fill: '#FFFFFF',
    align: 'center',
    wordWrap: true,
    wordWrapWidth: gameWidth - 40 // Margen de seguridad a los lados
  });
  instructionsDisplay.anchor.set(0.5);

  // 4. Texto parpadeante/indicador para empezar a jugar
  let startPrompt = game.add.text(game.world.centerX, game.height - 80, "Pulse ENTER para empezar", {
    font: 'bold 22px system-ui, Arial',
    fill: '#00FFCC',
    align: 'center'
  });
  startPrompt.anchor.set(0.5);

  // Efecto visual sutil de parpadeo (Blink) para el prompt de ENTER
  game.add.tween(startPrompt)
    .to({ alpha: 0.3 }, 600, Phaser.Easing.Linear.None, true, 0, -1, true);

  // 5. Capturar la tecla ENTER
  enterKey = game.input.keyboard.addKey(Phaser.Keyboard.ENTER);
}

function updateInstructionMenu() {
  // Cuando el usuario pulsa ENTER, se inicia el nivel real
  if (enterKey.justDown) {
    game.state.start('Game');
  }
}