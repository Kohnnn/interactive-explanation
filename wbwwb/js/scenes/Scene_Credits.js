function Scene_Credits() {
  var self = this;
  Scene.call(self);

  var blackout = MakeSprite("blackout");
  Game.stage.addChild(blackout);

  var cont = new PIXI.Container();
  cont.alpha = 0;
  Game.stage.addChild(cont);

  var title = new PIXI.Text("Thanks for playing.", {
    font: "60px Cairo",
    fill: "#FFFFFF",
    align: "center"
  });
  title.anchor.x = 0.5;
  title.anchor.y = 0.5;
  title.x = Game.width / 2;
  title.y = Game.height / 2 - 20;
  cont.addChild(title);

  var subtitle = new PIXI.Text("Now the cameras are gone.", {
    font: "34px Cairo",
    fill: "#BBBBBB",
    align: "center"
  });
  subtitle.anchor.x = 0.5;
  subtitle.anchor.y = 0.5;
  subtitle.x = Game.width / 2;
  subtitle.y = Game.height / 2 + 50;
  cont.addChild(subtitle);

  Tween_get(cont)
    .wait(_s(BEAT * 4))
    .to({ alpha: 1 }, _s(BEAT), Ease.quadInOut)
    .wait(_s(BEAT * 4))
    .to({ alpha: 0 }, _s(BEAT), Ease.quadInOut)
    .call(function () {
      var ambience = Game.sounds.bg_nighttime;
      ambience.loop(true);
      ambience.volume(0);
      ambience.play();
      ambience.fade(0, 1, 2000);
      Game.sceneManager.gotoScene("Post_Credits");
    });
}
