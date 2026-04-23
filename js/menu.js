// Splash menu

let splashMenuState = {
  preload: loadSplashMenu,
  create:  createSplashMenu,
  update:  updateSplashMenu
};

let enterKey;

function loadSplashMenu(){
  game.load.image('splash', 'imgs/splash.png');
};

function createSplashMenu(){
    let bg = game.add.image(0, 0, 'splash');
    bg.width = game.width;
    bg.height = game.height;

    let text = game.add.text(
      game.world.centerX,
      game.world.centerY - 80, // -80 offset test
      'Press ENTER to START',
      {
        font: 'bold 32px system-ui, Arial',
        fill: '#ffffff'
      }
    );
    text.anchor.set(0.5);

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
  selectedLevel = 0;
  levelTexts = [];

  const levels = ['ivel 1', 'Nivel 2', 'Nivel 3'];
  const style = { font: 'bold 32px system-ui, Arial', fill: '#ffffff' };

  for(let i = 0; i < levels.length; i++){
    let txt = game.add.text(game.world.centerX, game.world.centerY - 80 + (i * 60), levels[i], style);
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
    selectedLevel = (selectedLevel > 0) ? selectedLevel - 1 : 2;
    updateTextSelection();
  }

  if (downKey.justDown) {
    selectedLevel = (selectedLevel < 2) ? selectedLevel + 1 : 0;
    updateTextSelection();
  }

  if (enterKey.justDown) {
    window.currentSelectedLevel = selectedLevel + 1; // +1 para que sea 1, 2 o 3 en lugar de 0, 1, 2
    game.state.start('Game');
  }
};

function updateTextSelection(){
  levelTexts.forEach((txt, index) => {
    if (index === selectedLevel) {
      txt.fill = "#ffffff";
      txt.text = "> " + ["Nivel 1", "Nivel 2", "Nivel 3"][index] + " <";
    } else {
      txt.fill = "#444444";
      txt.text = ["Nivel 1", "Nivel 2", "Nivel 3"][index];
    }
  });  
};