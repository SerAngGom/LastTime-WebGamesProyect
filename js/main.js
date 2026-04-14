let game = new Phaser.Game(gameWidth, gameHeight, Phaser.AUTO, 'game');

game.state.add('Game', gameState);
game.state.start('Game');
