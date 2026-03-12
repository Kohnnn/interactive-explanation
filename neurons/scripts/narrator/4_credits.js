Narrator.addNarration({
	file: "4_credits",
	markers:{
		"cred11": ["0:35.0", "0:39.4"],
		"cred12": ["0:39.4", "0:42.7"],
		"cred13": ["0:42.7", "0:43.8"],
		"cred14": ["0:44.0", "0:46.5"],
		"cred15": ["0:46.5", "0:47.4"],
		"cred16": ["0:50.0", "0:53.5"],
		"cred17": ["0:53.5", "0:54.2"],
		"cred18": ["0:54.2", "0:55.7"],
		"cred19": ["0:55.7", "0:56.5"],
		"cred20": ["0:56.5", "0:57.3"],
		"cred21": ["0:57.3", "0:59.2"]
	}
});

Narrator.addStates({

	CREDITS:{
		start:function(){
			Narrator.scene("Credits")
					.talk("cred11","cred12","cred13","cred14","cred15")
					.talk("cred16","cred17","cred18","cred19","cred20","cred21");
		}
	}

});
