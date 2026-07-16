function attachManualControls(){
	var host = document.getElementById("manual_controls");
	if(!host || host.dataset.ready) return;
	host.dataset.ready = "true";
	var label = document.createElement("label");
	label.textContent = "Move";
	var select = document.createElement("select");
	select.id = "polygon-select";
	label.htmlFor = select.id;
	var up = document.createElement("button");
	up.type = "button";
	up.textContent = "Up";
	var down = document.createElement("button");
	down.type = "button";
	down.textContent = "Down";
	var left = document.createElement("button");
	left.type = "button";
	left.textContent = "Left";
	var right = document.createElement("button");
	right.type = "button";
	right.textContent = "Right";
	var state = document.createElement("output");
	state.setAttribute("aria-live", "polite");
	host.appendChild(label);
	host.appendChild(select);
	host.appendChild(up);
	host.appendChild(left);
	host.appendChild(right);
	host.appendChild(down);
	host.appendChild(state);
	var selected = 0;
	var available = [];
	function refresh(){
		if(!window.draggables) return;
		for(var i=0; i<draggables.length; i++) draggables[i].update();
		available = draggables.map(function(polygon, index){ return polygon.shaking ? index : -1; }).filter(function(index){ return index >= 0; });
		if(available.indexOf(selected) < 0) selected = available[0];
		select.innerHTML = "";
		for(var i=0; i<available.length; i++){
			var index = available[i];
			var option = document.createElement("option");
			option.value = index;
			option.textContent = draggables[index].color+" "+(index+1);
			select.appendChild(option);
		}
		select.value = selected;
		announce();
	}
	function announce(){
		var polygon = window.draggables && draggables[selected];
		if(!polygon){
			state.textContent = "No polygons.";
			return;
		}
		state.textContent = polygon.color+" "+(selected+1)+" at "+Math.round(polygon.gotoX/TILE_SIZE)+", "+Math.round(polygon.gotoY/TILE_SIZE)+(polygon.shaking ? ", unhappy" : ", settled");
	}
	function move(dx, dy){
		var polygon = window.draggables && draggables[selected];
		if(!polygon) return;
		if(!polygon.shaking){
			state.textContent = "Select an unhappy polygon to move.";
			return;
		}
		var x = Math.max(0, Math.min(GRID_SIZE-1, Math.floor(polygon.gotoX/TILE_SIZE)+dx));
		var y = Math.max(0, Math.min(GRID_SIZE-1, Math.floor(polygon.gotoY/TILE_SIZE)+dy));
		for(var i=0; i<draggables.length; i++){
			if(i!==selected && Math.floor(draggables[i].gotoX/TILE_SIZE)===x && Math.floor(draggables[i].gotoY/TILE_SIZE)===y){
				state.textContent = "That spot is occupied.";
				return;
			}
		}
		polygon.gotoX = (x+0.5)*TILE_SIZE;
		polygon.gotoY = (y+0.5)*TILE_SIZE;
		if(window.render) render();
		announce();
	}
	select.onchange = function(){ selected = Number(select.value); announce(); };
	up.onclick = function(){ move(0,-1); };
	down.onclick = function(){ move(0,1); };
	left.onclick = function(){ move(-1,0); };
	right.onclick = function(){ move(1,0); };
	window.refreshManualControls = refresh;
	refresh();
}
