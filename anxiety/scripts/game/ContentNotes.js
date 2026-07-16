var ContentNotes = {};

(function(){

	var cnDOM = $("#content_notes");
	var opener;

	var hideContentNotes = function(){
		sfx("ui_click");
		cnDOM.style.top = "";
		ContentNotes.showing = false;
		if(cnDOM.open) cnDOM.close();
		Game.onUnpause();
		opener?.focus();
	};

	subscribe("show_cn", function(){

		opener = document.activeElement;
		cnDOM.style.top = "65px";
		if(!cnDOM.open) cnDOM.showModal();
		ContentNotes.showing = true;
		Game.pause();
		Howler.mute(false);

		if(window.NO_CUSS_MODE) $("#cn_cussing").style.display = "none";

	});

	subscribe("hide_cn", hideContentNotes);
	cnDOM.addEventListener("cancel", function(event){
		event.preventDefault();
		hideContentNotes();
	});

})();