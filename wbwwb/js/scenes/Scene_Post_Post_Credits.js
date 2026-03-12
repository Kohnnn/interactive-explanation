Game.addToManifest({
  end_button: "sprites/postcredits/end_button.json"
});

function Scene_Post_Post_Credits() {
  var self = this;
  Scene.call(self);

  self.UNPAUSEABLE = true;

  Game.stage.addChild(MakeSprite("blackout"));

  var cont = new PIXI.Container();
  cont.visible = false;
  Game.stage.addChild(cont);

  var title = new PIXI.Text("Take a breath.\nThen replay the spiral.", {
    font: "54px Cairo",
    fill: "#FFFFFF",
    align: "center"
  });
  title.anchor.x = 0.5;
  title.anchor.y = 0.5;
  title.x = Game.width / 2;
  title.y = 175;
  cont.addChild(title);

  var subtitle = new PIXI.Text("The ending is part of the loop, too.", {
    font: "28px Cairo",
    fill: "#BBBBBB",
    align: "center"
  });
  subtitle.anchor.x = 0.5;
  subtitle.anchor.y = 0.5;
  subtitle.x = Game.width / 2;
  subtitle.y = 255;
  cont.addChild(subtitle);

  var button = new PIXI.Container();
  button.x = Game.width / 2;
  button.y = 360;
  cont.addChild(button);

  var bg = MakeMovieClip("end_button");
  bg.anchor.x = bg.anchor.y = 0.5;
  button.addChild(bg);

  var label = MakeMovieClip("end_button");
  label.anchor.x = label.anchor.y = 0.5;
  label.gotoAndStop(4);
  button.addChild(label);

  var isHovering = false;
  button.interactive = true;
  button.mouseover = button.touchstart = function () {
    isHovering = true;
    bg.gotoAndStop(1);
    Tween_get(button.scale).to({ x: 1.05, y: 1.05 }, _s(0.2));
  };
  button.mouseout = function () {
    isHovering = false;
    bg.gotoAndStop(0);
    Tween_get(button.scale).to({ x: 1, y: 1 }, _s(0.2));
  };
  button.mousedown = button.touchend = function () {
    isHovering = false;
    Game.sounds.squeak.play();
    Game.sceneManager.gotoScene("Quote");
  };

  var cursor = new Cursor(self);
  var g = cursor.graphics;
  cont.addChild(g);
  g.scale.x = g.scale.y = 0.5;
  g.x = Game.width / 2;
  g.y = Game.height / 2;

  Tween_get(cont)
    .wait(_s(BEAT * 2))
    .call(function () {
      cont.visible = true;
    });

  self.update = function () {
    cursor.update(isHovering);
  };
}
