Narrator.addNarration({
	file: "0_intro",
	markers:{
		"intro0": ["0:00.0", "0:03.0"],
		"intro1": ["0:03.0", "0:05.7"],
		"intro2": ["0:05.7", "0:08.0"],
		"intro3": ["0:08.0", "0:09.0"],

		"prop0": ["0:15.0", "0:16.3"],
		"prop1": ["0:16.3", "0:19.6"],
		"prop2": ["0:22.0", "0:23.5"],
		"prop3": ["0:23.5", "0:25.4"],
		"prop4": ["0:25.4", "0:27.8"],

		"prop5": ["0:29.0", "0:31.7"],

		"prop6": ["0:33.0", "0:35.4"],
		"prop7": ["0:35.4", "0:36.5"],

		"prop8": ["0:38.0", "0:38.7"],
		"prop8.5": ["0:38.7", "0:40.5"],
		"prop9": ["0:40.5", "0:42.6"],
		"prop10": ["0:45.0", "0:46.1"],

		"prop11": ["0:48.0", "0:50.3"],
		"prop12": ["0:50.3", "0:52.2"],
		"prop13": ["0:52.2", "0:54.7"],
		"prop14": ["0:54.7", "0:57.3"],

		"fear0": ["0:57.5", "0:59.2"],
		"fear1": ["1:00.0", "1:03.0"],
		"fear2": ["1:03.0", "1:08.1"],
		"fear3": ["1:08.1", "1:10.2"],
		"fear4": ["1:10.2", "1:11.3"],
		"fear5": ["1:11.3", "1:12.0"],
		"fear6": ["1:12.0", "1:15.5"],
		"fear7": ["1:15.5", "1:18.5"],

		"mesmerizing": ["1:20.0", "1:22.2"]
	}
});

Narrator.addStates({

	INTRO:{
		start:function(state){
			Narrator.scene("Intro").talk("intro0","intro1","intro2")
					.scene("Propagation")
					.music("sfx_loop",{volume:0.05,loop:-1})
					.talk("intro3")
					.goto("PROP_INTERRUPTABLE");
		}
	},

	PROP_INTERRUPTABLE:{
		start:function(state){
			Narrator.talk("prop2").goto("PROP_CLICK");
			state._listener = subscribe("/neuron/click",function(neuron){
				unsubscribe(state._listener);
				Narrator.interrupt().talk("prop5").goto("PROP_EXPLAIN");
			});
		},
		kill:function(state){
			unsubscribe(state._listener);
		}
	},

	PROP_CLICK:{
		start:function(state){
			Narrator.talk("prop3","prop4");
			state._listener = subscribe("/neuron/click",function(neuron){
				unsubscribe(state._listener);
				Narrator.talk("prop8").goto("PROP_EXPLAIN");
			});
		},
		kill:function(state){
			unsubscribe(state._listener);
		}
	},

	PROP_EXPLAIN:{
		start:function(state){
			Narrator.talk("prop8.5","prop9","mesmerizing","prop10").goto("PROP_CLICK_MORE");
		}
	},

	PROP_CLICK_MORE:{
		start:function(state){

			state._ticker = -1;
			state._clicked = 0;
			state._listener = subscribe("/neuron/click",function(neuron){

				if(state._ticker<0) state._ticker=40;
				state._clicked++;
				if(state._clicked==3){
					unsubscribe(state._listener);
					if(state._ticker>0){
						Narrator.wait(0.5).talk("prop6","prop7").goto("FEAR");
					}else{
						Narrator.wait(1.0).goto("FEAR");
					}
				}

			});

		},
		during:function(state){
			if(state._ticker>0){
				state._ticker--;
			}
		}
	},

	FEAR:{
		start:function(state){
			Narrator.talk("prop11","prop12","prop13","prop14")
					.scene("Anxiety")
					.talk("fear0","fear1","fear2","fear3",
						  "fear4","fear5","fear6","fear7")
					.goto("HEBBIAN");
		}
	}

});
