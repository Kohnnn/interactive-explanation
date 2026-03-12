window.$ = (query,el=document)=>{
	return el.querySelector(query);
};
window.$all = (query,el=document)=>{
	return [...el.querySelectorAll(query)];
};

let footnotesContainer = $('#footnotes_container');
let footnotes = $('.footnotes');

if(footnotesContainer && footnotes){
	footnotesContainer.appendChild(footnotes);
}

if($('#show_feetnotes_button') && $('#shown_feetnotes') && footnotes){
	$('#show_feetnotes_button').onclick = ()=>{
		$('#show_feetnotes_button').style.display = 'none';
		$('#shown_feetnotes').style.display = 'block';
		footnotes.style.display = 'block';
	};
}

$all('.footnotes a[rev="footnote"]').forEach((a)=>{
	a.setAttribute('target','_self');
});
