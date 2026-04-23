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
      game.state.start('Game');
    }
};

let levelMenuState = {
  create: createLevelMenu,
  update: updateLevelMenu
};