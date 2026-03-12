function Scene_Credits(){

	var self = this;
	BrainScene.call(self);

	self.setCamera(680, 355, 0.8);

	Neuron.unserialize(self,'{"neurons":[[-92,-72],[-24,75],[-57,199],[-77,304],[-76,405],[-65,538],[-81,696],[45,-72],[56,84],[27,205],[35,321],[91,433],[32,521],[89,659],[208,-35],[153,57],[186,214],[202,289],[174,384],[149,558],[193,675],[266,-90],[273,85],[276,158],[300,324],[288,424],[330,573],[284,687],[452,-28],[431,87],[412,206],[452,287],[387,387],[395,539],[401,628],[518,-80],[570,65],[542,146],[558,318],[522,407],[513,527],[505,637],[661,-83],[656,54],[678,213],[654,294],[660,430],[676,541],[648,669],[780,-81],[752,64],[808,201],[799,330],[746,420],[808,522],[779,657],[892,-81],[889,682],[-291,-76],[-308,94],[-303,201],[-292,325],[-254,387],[-284,565],[-282,635]],"connections":[[33,25],[25,33],[25,17],[17,25],[17,23],[23,17],[23,30],[30,23],[30,31],[31,30],[31,37],[37,31],[37,44],[44,37],[44,45],[45,44],[45,39],[39,45],[39,33],[33,39]]}');

	self.thx = new Sprite({
		pivotX:0.5, pivotY:0.5,
		spritesheet: images.thx,
		frameWidth:300, frameHeight:400,
		frameTotal:6
	});
	self.sprites.push(self.thx);
	self.thx.timer = 0;
	self.thx.visible = false;
	self.thx.x = 1050;
	self.thx.y = 320;
	self.thx.scale = (1/self.cameraEased.zoom);

	var heartNeurons = [33, 25, 17, 23, 30, 31, 37, 44, 45, 39];
	var timer = -15;
	var _prevUpdate = self.update;
	self.update = function(){

		timer++;
		if(timer>=0 && timer%3==0){
			var index = timer/3;
			if(index<heartNeurons.length){
				self.neurons[heartNeurons[index]].pulse({strength:5});
			}
		}

		self.thx.timer++;
		if(self.thx.timer>=70){
			self.thx.timer = 0;
			if(!self.thx.visible){
				self.thx.visible = true;
			}else{
				if(self.thx.currentFrame<self.thx.frameTotal-1){
					self.thx.currentFrame++;
				}else{
					self.thx.gotoSmoosh = 0;
				}
			}
		}

		_prevUpdate.call(self);

		if(self.thx.smoosh<0.09){
			self.thx.dead = true;
		}

	};

}
