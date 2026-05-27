let game = new Phaser.Game(gameWidth, gameHeight, Phaser.AUTO, 'game');

game.state.add('SplashMenu', splashMenuState);
game.state.add('LevelMenu', levelMenuState);
game.state.add('HofMenu', hofMenuState);
game.state.add('UnlockMenu', unlockMenuState);
game.state.add('InstructionMenu', instructionMenuState);
game.state.add('Game', gameState);

game.state.start('SplashMenu');
