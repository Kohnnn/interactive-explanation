var ne=Object.defineProperty;var ee=s=>{throw TypeError(s)};var ae=(s,r,e)=>r in s?ne(s,r,{enumerable:!0,configurable:!0,writable:!0,value:e}):s[r]=e;var P=(s,r,e)=>ae(s,typeof r!="symbol"?r+"":r,e),J=(s,r,e)=>r.has(s)||ee("Cannot "+e);var i=(s,r,e)=>(J(s,r,"read from private field"),e?e.call(s):r.get(s)),y=(s,r,e)=>r.has(s)?ee("Cannot add the same private member more than once"):r instanceof WeakSet?r.add(s):r.set(s,e),c=(s,r,e,t)=>(J(s,r,"write to private field"),t?t.call(s,e):r.set(s,e),e),Z=(s,r,e)=>(J(s,r,"access private method"),e);import{B as oe,t as C,a as B,u as x,S as le,U as ue,C as he,V as te,c as fe,M as pe,v as de,w as me,x as ve}from"./bHzPANiV.js";const g=6;var a,T,k,N,q,X,R,F,o,Y,G,j,D,E,re,Q;class xe extends oe{constructor(){super(...arguments);y(this,E);P(this,"isMeshLineGeometry",!0);P(this,"type","MeshLineGeometry");y(this,a,new Float32Array);y(this,T,new Float32Array);y(this,k,new Float32Array);y(this,N,new Float32Array);y(this,q,new Float32Array);y(this,X,new Float32Array);y(this,R,new Uint16Array);y(this,F,new Float32Array);P(this,"widthCallback",null);y(this,o,null);y(this,Y,[]);y(this,G,null);y(this,j,0);y(this,D,0)}get points(){return i(this,Y)}set points(e){this.setPoints(e,this.widthCallback)}setPoints(e,t=null,f=!0){if(c(this,Y,e),c(this,G,this.widthCallback),this.widthCallback=t,!("length"in e))throw new Error("not a Vector3 Array, or not a number Array or Float32Array with 3 numbers per point");if(!e.length){this.dispose(),c(this,D,0),c(this,j,0);return}const h=ce(e);if(h)c(this,D,e.length);else{if(e.length%3!==0)throw new Error("The array should consist of number triplets, 3 number per point.");c(this,D,e.length/3)}const n=i(this,D),v=i(this,j)!==n,z=i(this,G)!==this.widthCallback;(!i(this,o)||v)&&Z(this,E,re).call(this,n),c(this,j,n);let S,p=0,d=0,m=0,U=0,A=0,M=0,W=0,O=0,b=0,V=0,$=0;if(h)for(let u=0;u<e.length;u++){const w=e[u];if(!w)throw new Error("point missing");({x:p,y:d,z:m}=w),L(i(this,a),U,p,d,m),U+=g;const _=u/e.length;i(this,F)[A+0]=_,i(this,F)[A+1]=_,A+=2}else for(let u=0;u<e.length;u+=3){const w=e[u+0],_=e[u+1],H=e[u+2];if(w==null||_==null||H==null)throw new Error("point missing");L(i(this,a),U,w,_,H),U+=g;const I=u/e.length;i(this,F)[A+0]=I,i(this,F)[A+1]=I,A+=2}let l=0;if(Z(this,E,Q).call(this,0,n-1)?(l=(n-2)*g,p=i(this,a)[l+0],d=i(this,a)[l+1],m=i(this,a)[l+2]):(l=0,p=i(this,a)[l+0],d=i(this,a)[l+1],m=i(this,a)[l+2]),p==null||d==null||m==null)throw new Error("point missing");L(i(this,T),M,p,d,m),M+=6;for(let u=0;u<n;u++){if(v&&(ie(i(this,N),O,1,-1),O+=2),(z||v)&&(this.widthCallback?S=this.widthCallback(u/(n-1)):S=1,ie(i(this,q),b,S,S),b+=2),v&&(ge(i(this,X),$,u/(n-1),0,u/(n-1),1),$+=4),u<n-1){if(l=u*g,p=i(this,a)[l+0],d=i(this,a)[l+1],m=i(this,a)[l+2],p==null||d==null||m==null)throw new Error("point missing");if(L(i(this,T),M,p,d,m),M+=6,v){const w=u*2;se(i(this,R),V,w+0,w+1,w+2),se(i(this,R),V+3,w+2,w+1,w+3),V+=6}}if(u>0){if(l=u*g,p=i(this,a)[l+0],d=i(this,a)[l+1],m=i(this,a)[l+2],p==null||d==null||m==null)throw new Error("point missing");L(i(this,k),W,p,d,m),W+=6}}if(Z(this,E,Q).call(this,n-1,0)?(l=1*g,p=i(this,a)[l+0],d=i(this,a)[l+1],m=i(this,a)[l+2]):(l=(n-1)*g,p=i(this,a)[l+0],d=i(this,a)[l+1],m=i(this,a)[l+2]),p==null||d==null||m==null)throw new Error("point missing");if(L(i(this,k),W,p,d,m),!i(this,o))throw new Error("missing attributes");i(this,o).position.needsUpdate=!0,i(this,o).previous.needsUpdate=!0,i(this,o).next.needsUpdate=!0,i(this,o).side.needsUpdate=v,i(this,o).width.needsUpdate=v,i(this,o).uv.needsUpdate=v,i(this,o).index.needsUpdate=v,f&&(this.computeBoundingSphere(),this.computeBoundingBox())}advance(e){if(!i(this,o))throw new Error("Call setPoints first.");const t=i(this,o).position.array,f=i(this,o).previous.array,h=i(this,o).next.array,n=t.length;K(t,0,f,0,n),K(t,g,t,0,n-g),t[n-6]=e.x,t[n-5]=e.y,t[n-4]=e.z,t[n-3]=e.x,t[n-2]=e.y,t[n-1]=e.z,K(t,g,h,0,n-g),h[n-6]=e.x,h[n-5]=e.y,h[n-4]=e.z,h[n-3]=e.x,h[n-2]=e.y,h[n-1]=e.z,i(this,o).position.needsUpdate=!0,i(this,o).previous.needsUpdate=!0,i(this,o).next.needsUpdate=!0}}a=new WeakMap,T=new WeakMap,k=new WeakMap,N=new WeakMap,q=new WeakMap,X=new WeakMap,R=new WeakMap,F=new WeakMap,o=new WeakMap,Y=new WeakMap,G=new WeakMap,j=new WeakMap,D=new WeakMap,E=new WeakSet,re=function(e){this.dispose(),c(this,o,{position:new C(c(this,a,new Float32Array(e*g)),3),previous:new C(c(this,T,new Float32Array(e*g)),3),next:new C(c(this,k,new Float32Array(e*g)),3),side:new C(c(this,N,new Float32Array(e*2)),1),width:new C(c(this,q,new Float32Array(e*2)),1),uv:new C(c(this,X,new Float32Array(e*4)),2),counters:new C(c(this,F,new Float32Array(e*2)),1),index:new C(c(this,R,new Uint16Array((e-1)*g)),1)}),this.setAttribute("position",i(this,o).position),this.setAttribute("previous",i(this,o).previous),this.setAttribute("next",i(this,o).next),this.setAttribute("side",i(this,o).side),this.setAttribute("width",i(this,o).width),this.setAttribute("uv",i(this,o).uv),this.setAttribute("counters",i(this,o).counters),this.setIndex(i(this,o).index)},Q=function(e,t){const f=e*g,h=t*g;return i(this,a)[f+0]===i(this,a)[h+0]&&i(this,a)[f+1]===i(this,a)[h+1]&&i(this,a)[f+2]===i(this,a)[h+2]};function ce(s){return!!(s.length&&s[0]instanceof B)}function K(s,r,e,t,f){if(t+f>e.length)throw new Error("Not enough space to copy from src to dst.");for(let h=0,n=r+f;h+r<n;h++){const v=s[h+r];if(v==null)throw new Error("missing src value");e[h+t]=v}}function ie(s,r,e,t){s[r+0]=e,s[r+1]=t}function se(s,r,e,t,f){s[r+0]=e,s[r+1]=t,s[r+2]=f}function L(s,r,e,t,f){s[r+0]=e,s[r+1]=t,s[r+2]=f,s[r+3]=e,s[r+4]=t,s[r+5]=f}function ge(s,r,e,t,f,h){s[r+0]=e,s[r+1]=t,s[r+2]=f,s[r+3]=h}x.meshline_vert=`
	${x.logdepthbuf_pars_vertex}
	${x.fog_pars_vertex}
	
	attribute vec3 previous;
	attribute vec3 next;
	attribute float side;
	attribute float width;
	attribute float counters;
	
	uniform vec2 resolution;
	uniform float lineWidth;
	uniform vec3 color;
	uniform float opacity;
	uniform float sizeAttenuation;
	
	varying vec2 vUV;
	varying vec4 vColor;
	varying float vCounters;
	
	vec2 fix( vec4 i, float aspect ) {
	
	    vec2 res = i.xy / i.w;
	    res.x *= aspect;
		 vCounters = counters;
	    return res;
        
	}
	
	void main() {
	
	    float aspect = resolution.x / resolution.y;
	
	    vColor = vec4( color, opacity );
	    vUV = uv;
	
	    mat4 m = projectionMatrix * modelViewMatrix;
	    vec4 finalPosition = m * vec4( position, 1.0 );
	    vec4 prevPos = m * vec4( previous, 1.0 );
	    vec4 nextPos = m * vec4( next, 1.0 );
	
	    vec2 currentP = fix( finalPosition, aspect );
	    vec2 prevP = fix( prevPos, aspect );
	    vec2 nextP = fix( nextPos, aspect );
	
	    float w = lineWidth * width;
	
	    vec2 dir;
	    if( nextP == currentP ) dir = normalize( currentP - prevP );
	    else if( prevP == currentP ) dir = normalize( nextP - currentP );
	    else {
	        vec2 dir1 = normalize( currentP - prevP );
	        vec2 dir2 = normalize( nextP - currentP );
	        dir = normalize( dir1 + dir2 );
	
	        vec2 perp = vec2( -dir1.y, dir1.x );
	        vec2 miter = vec2( -dir.y, dir.x );
	        //w = clamp( w / dot( miter, perp ), 0., 4. * lineWidth * width );
	
	    }
	
	    //vec2 normal = ( cross( vec3( dir, 0. ), vec3( 0., 0., 1. ) ) ).xy;
	    vec4 normal = vec4( -dir.y, dir.x, 0., 1. );
	    normal.xy *= .5 * w;
	    normal *= projectionMatrix;
	    if( sizeAttenuation == 0. ) {
	        normal.xy *= finalPosition.w;
	        normal.xy /= ( vec4( resolution, 0., 1. ) * projectionMatrix ).xy;
	    }
	
	    finalPosition.xy += normal.xy * side;
	
	    gl_Position = finalPosition;
	
        ${x.logdepthbuf_vertex}
        vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
        ${x.fog_vertex}
	}
`;x.meshline_frag=`
	${x.fog_pars_fragment}
	${x.logdepthbuf_pars_fragment}
	
	uniform sampler2D map;
	uniform sampler2D alphaMap;
	uniform float useMap;
	uniform float useAlphaMap;
	uniform float useDash;
	uniform float dashArray;
	uniform float dashOffset;
	uniform float dashRatio;
	uniform float visibility;
	uniform float alphaTest;
	uniform vec2 repeat;

	varying vec2 vUV;
	varying vec4 vColor;
	varying float vCounters;
	
	void main() {
        ${x.logdepthbuf_fragment}

	    vec4 c = vColor;
	    if( useMap == 1. ) c *= texture2D( map, vUV * repeat );
	    if( useAlphaMap == 1. ) c.a *= texture2D( alphaMap, vUV * repeat ).a;
	    if( c.a < alphaTest ) discard;
	    if( useDash == 1. ){
	        c.a *= ceil(mod(vCounters + dashOffset, dashArray) - (dashArray * dashRatio));
	    }
	    gl_FragColor = c;
	    gl_FragColor.a *= step(vCounters, visibility);
	
        ${x.fog_fragment}
	}
`;class be extends le{constructor(e){super({uniforms:Object.assign({},ue.fog,{lineWidth:{value:1},map:{value:null},useMap:{value:!1},alphaMap:{value:null},useAlphaMap:{value:!1},color:{value:new he(16777215)},opacity:{value:1},resolution:{value:new te(1,1)},sizeAttenuation:{value:!0},dashArray:{value:0},dashOffset:{value:0},dashRatio:{value:.5},useDash:{value:!1},visibility:{value:1},alphaTest:{value:0},repeat:{value:new te(1,1)}}),vertexShader:x.meshline_vert,fragmentShader:x.meshline_frag});P(this,"isMeshLineMaterial",!0);P(this,"type","MeshLineMaterial");Object.defineProperties(this,{fogColor:{enumerable:!0,get:()=>this.uniforms.fogColor.value,set:t=>{this.uniforms.fogColor.value=t}},fogDensity:{enumerable:!0,get:()=>this.uniforms.fogDensity.value,set:t=>{this.uniforms.fogDensity.value=t}},fogNear:{enumerable:!0,get:()=>this.uniforms.fogNear.value,set:t=>{this.uniforms.fogNear.value=t}},fogFar:{enumerable:!0,get:()=>this.uniforms.fogFar.value,set:t=>{this.uniforms.fogFar.value=t}},lineWidth:{enumerable:!0,get:()=>this.uniforms.lineWidth.value,set:t=>{this.uniforms.lineWidth.value=t}},map:{enumerable:!0,get:()=>this.uniforms.map.value,set:t=>{this.uniforms.map.value=t}},useMap:{enumerable:!0,get:()=>this.uniforms.useMap.value,set:t=>{this.uniforms.useMap.value=t}},alphaMap:{enumerable:!0,get:()=>this.uniforms.alphaMap.value,set:t=>{this.uniforms.alphaMap.value=t}},useAlphaMap:{enumerable:!0,get:()=>this.uniforms.useAlphaMap.value,set:t=>{this.uniforms.useAlphaMap.value=t}},color:{enumerable:!0,get:()=>this.uniforms.color.value,set:t=>{this.uniforms.color.value=t}},opacity:{enumerable:!0,get:()=>this.uniforms.opacity.value,set:t=>{this.uniforms.opacity.value=t}},resolution:{enumerable:!0,get:()=>this.uniforms.resolution.value,set:t=>{this.uniforms.resolution.value.copy(t)}},sizeAttenuation:{enumerable:!0,get:()=>this.uniforms.sizeAttenuation.value,set:t=>{this.uniforms.sizeAttenuation.value=t}},dashArray:{enumerable:!0,get:()=>this.uniforms.dashArray.value,set:t=>{this.uniforms.dashArray.value=t,this.useDash=t!==0}},dashOffset:{enumerable:!0,get:()=>this.uniforms.dashOffset.value,set:t=>{this.uniforms.dashOffset.value=t}},dashRatio:{enumerable:!0,get:()=>this.uniforms.dashRatio.value,set:t=>{this.uniforms.dashRatio.value=t}},useDash:{enumerable:!0,get:()=>this.uniforms.useDash.value,set:t=>{this.uniforms.useDash.value=t}},visibility:{enumerable:!0,get:()=>this.uniforms.visibility.value,set:t=>{this.uniforms.visibility.value=t}},alphaTest:{enumerable:!0,get:()=>this.uniforms.alphaTest.value,set:t=>{this.uniforms.alphaTest.value=t}},repeat:{enumerable:!0,get:()=>this.uniforms.repeat.value,set:t=>{this.uniforms.repeat.value.copy(t)}}}),this.setValues(e)}copy(e){return super.copy(this),this.fogColor=e.fogColor,this.fogDensity=e.fogDensity,this.fogNear=e.fogNear,this.fogFar=e.fogFar,this.lineWidth=e.lineWidth,this.map=e.map,this.useMap=e.useMap,this.alphaMap=e.alphaMap,this.useAlphaMap=e.useAlphaMap,this.color.copy(e.color),this.opacity=e.opacity,this.resolution.copy(e.resolution),this.sizeAttenuation=e.sizeAttenuation,this.dashArray=e.dashArray,this.dashOffset=e.dashOffset,this.dashRatio=e.dashRatio,this.useDash=e.useDash,this.visibility=e.visibility,this.alphaTest=e.alphaTest,this.repeat.copy(e.repeat),this}}class Ae extends fe{constructor(){super(...arguments);P(this,"isMeshLine",!0);P(this,"type","MeshLine")}raycast(e,t){const f=new pe,h=new de,n=new me,v=new B,z=this.geometry;if(z.boundingSphere||z.computeBoundingSphere(),n.copy(z.boundingSphere),n.applyMatrix4(this.matrixWorld),!e.ray.intersectSphere(n,v))return;f.copy(this.matrixWorld).invert(),h.copy(e.ray).applyMatrix4(f);const S=new B,p=new B,d=new B,m=this instanceof ve?2:1,U=z.index,A=z.attributes;if(U!==null){const M=U.array,W=A.position.array,O=A.width.array;for(let b=0,V=M.length-1;b<V;b+=m){const $=M[b],l=M[b+1];if($==null||l==null)throw new Error("missing index");S.fromArray(W,$*3),p.fromArray(W,l*3);const u=O[Math.floor(b/3)]!==void 0?O[Math.floor(b/3)]:1;if(u==null)throw new Error("missing width");e.params.Line=e.params.Line??{threshold:1};const w=e.params.Line.threshold+this.material.lineWidth*u/2,_=w*w;if(h.distanceSqToSegment(S,p,v,d)>_)continue;v.applyMatrix4(this.matrixWorld);const I=e.ray.origin.distanceTo(v);I<e.near||I>e.far||(t.push({distance:I,point:d.clone().applyMatrix4(this.matrixWorld),index:b,face:null,faceIndex:void 0,object:this}),b=V)}}}}export{xe as M,be as a,Ae as b};
