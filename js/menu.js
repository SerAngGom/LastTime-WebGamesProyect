let menuState = {
  preload: function() {
    game.load.image('inicio', 'imgs/inicio.png');
  },

  create: function() {
    // Fondo
    let bg = game.add.image(0, 0, 'inicio');
    bg.width = game.width;
    bg.height = game.height;

    // Texto centrado
    let text = game.add.text(
      game.world.centerX,
      game.world.centerY,
      'Press ENTER to START',
      {
        font: 'bold 28px system-ui, Arial',
        fill: '#ffffff'
      }
    );
    text.anchor.set(0.5);

    // Tecla ENTER
    this.enterKey = game.input.keyboard.addKey(Phaser.Keyboard.ENTER);
  },

  update: function() {
    if (this.enterKey.justDown) {
      game.state.start('Game');
    }
  }
};