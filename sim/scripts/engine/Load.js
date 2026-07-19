(function(){

// Get the path to the JSON
var parameterError = false;
function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    if(results === null) return "";
    try{
        return decodeURIComponent(results[1].replace(/\+/g, " "));
    }catch(error){
        parameterError = true;
        return "";
    }
}

// Local or Remote or URL?
var path, local, lz, url;
if(local = getParameterByName("s")){ // note: "=" not "=="
    path = "models/"+local+".json";
}else if(lz = getParameterByName("lz")){ // also: "=" not "=="
    //path = Save.baseURL+remote+".json?print=pretty";
    // REPLACE WITH LZ-WHATEVER.
}else if(url = getParameterByName("url")){ // yup: "=" not "=="
    path = url;
}else{
    path = "models/forest.json";
}

let onLoadError = ()=>{
    document.body.style.display = "block";
    var main = document.querySelector("main[data-runtime-main]");
    main.textContent = "The model could not load.";
    main.setAttribute("aria-busy", "false");
};

let onLoadSuccess = (model)=>{

    // Recursive: every state, and action within, must have actions.
    // Yeah this over-does it, but whatever.
    var _mustHaveActions = function(array){
        for(var i=0;i<array.length;i++){
            var item = array[i];
            item.actions = item.actions || [];
            _mustHaveActions(item.actions);
        }
    };
    _mustHaveActions(model.states);

    // Show all the UI, whatever.
    document.body.style.display = "block";
    document.querySelector("main[data-runtime-main]").setAttribute("aria-busy", "false");

    // Now init 'em
    Model.init(model);

};

if(parameterError){

    onLoadError();

}else if(lz){

    try{
        let compressedData = LZString.decompressFromEncodedURIComponent(lz);
        let data = JSON.parse(compressedData);
        onLoadSuccess(data);
    }catch(error){
        onLoadError();
    }

}else{

    // Load it & make it the model
    reqwest({
        url: path,
        type: 'json', 
        method: 'get',
        error: function(err){
            onLoadError();
        },
        success: (model)=>{
            onLoadSuccess(model);
        }
    });

}

})();