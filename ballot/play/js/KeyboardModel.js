function attachModelControls(model, config){
	if(model.keyboardControls) return model.keyboardControls;
	config = config || {};
	var controls = document.createElement("div");
	controls.className = "model-keyboard-controls";
	var label = document.createElement("label");
	label.textContent = "Move";
	var select = document.createElement("select");
	select.id = "model-object-select";
	label.htmlFor = select.id;
	select.setAttribute("aria-label", "Object to move");
	var arrows = document.createElement("div");
	arrows.className = "model-keyboard-arrows";
	var live = document.createElement("div");
	live.className = "model-keyboard-state";
	live.setAttribute("aria-live", "polite");
	controls.appendChild(label);
	controls.appendChild(select);
	controls.appendChild(arrows);
	controls.appendChild(live);
	model.dom.appendChild(controls);
	var selected = 0;
	function objects(){
		return model.draggables;
	}
	function nameFor(object, index){
		if(model.candidates.indexOf(object)>=0) return "Candidate "+object.id;
		return "Voter group "+(model.voters.indexOf(object)+1);
	}
	function refresh(){
		var items = objects();
		if(selected>=items.length) selected = 0;
		select.innerHTML = "";
		for(var i=0; i<items.length; i++){
			var option = document.createElement("option");
			option.value = i;
			option.textContent = nameFor(items[i], i);
			select.appendChild(option);
		}
		select.value = selected;
		announce();
	}
	function announce(){
		var object = objects()[selected];
		if(!object){
			live.textContent = "No movable object.";
			return;
		}
		var result = model.caption.textContent.replace(/\s+/g, " ").trim();
		live.textContent = nameFor(object, selected)+" at "+Math.round(object.x)+", "+Math.round(object.y)+(result ? ". "+result : "");
	}
	function move(dx, dy){
		var object = objects()[selected];
		if(!object) return;
		object.x = Math.max(0, Math.min(model.size, object.x+dx));
		object.y = Math.max(0, Math.min(model.size, object.y+dy));
		if(object.gotoX!==undefined){
			object.gotoX = object.x;
			object.gotoY = object.y;
		}
		model.update();
		announce();
	}
	function addButton(text, dx, dy){
		var button = document.createElement("button");
		button.type = "button";
		button.textContent = text;
		button.setAttribute("aria-label", "Move selected object "+text);
		button.onclick = function(){ move(dx, dy); };
		arrows.appendChild(button);
	}
	addButton("Up", 0, -10);
	addButton("Left", -10, 0);
	addButton("Right", 10, 0);
	addButton("Down", 0, 10);
	select.onchange = function(){
		selected = Number(select.value);
		announce();
	};
	model.keyboardControls = {refresh:refresh, announce:announce};
	refresh();
	return model.keyboardControls;
}
