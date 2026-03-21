import{_ as ne}from"./C59ZLK1E.js";import{V as l,c as A,P as ie,S as re,D as se,C as f,d as ce,e as ue,f as me,R as G,N as j}from"./bHzPANiV.js";import{t as c}from"./Xcv7L_A9.js";import{R as E}from"./DnHCvtQB.js";import{T as I}from"./Bk5zZkgy.js";import{D as $}from"./fy9MQSiB.js";import{c as de}from"./Bp5SoErB.js";import{c as pe}from"./BfEh5_e5.js";import{u as fe}from"./BmIRRXNc.js";import{P as ve}from"./McSv00Fw.js";import{c as ge}from"./wSNomYEf.js";import{r as he}from"./DKWtBtuP.js";import{_ as we}from"./CmnZB1Y2.js";import{f as xe,m as ye,x as H,q as v,g as Se,h as q,o as be,v as Ce,w as Ve,b as Re}from"./D4VqJVMa.js";import"./DgRwrsyr.js";import"./DlAUqK2U.js";import"./BjzJ_NeO.js";import"./BChHPyao.js";import"./Cpj98o6Y.js";import"./esM5muFG.js";const x=200,R=70,k=10,$e=xe({__name:"BallSlope",props:{id:{}},setup(K){const F=K,J=ye(he),U=H(null),u=v(()=>U.value.wrapper),z=H(!1),g=new l(0,0),M={scale:1.5,lineWidth:2.1,arrowSize:2.8},m={ball:c.amber[400],normalVector:c.teal[500],gravityVector:c.rose[500],totalForceVector:c.gray[700],floorEdge:c.zinc[600]};let d,P,_,y,r,s,W=0;const S=new l(0,-20),L=new ve;L.afterTick(()=>Z());const h=H(0),n=v(()=>h.value*Math.PI/180),w=v(()=>{const e=Math.cos(-n.value);return new l(Math.sin(n.value),e).multiplyScalar(e*S.length())}),D=v(()=>w.value.clone().add(S)),Q=v(()=>new l(Math.cos(n.value),-Math.sin(n.value))),B=v(()=>{const e=R/2,t=e/Math.sin(Math.PI/2-n.value),o=Q.value,a=new l(g.x,-e+t),O=g.clone().sub(a),ae=O.dot(o);let V=O.clone().sub(o.clone().multiplyScalar(ae));const le=k+V.length();return V.length()===0&&(V=new l(0,-1)),new l(0,-e).add(V.clone().normalize().multiplyScalar(le))}),i=new A(new ie(x,R),new re({uniforms:{uTexture:{value:new se},uWidth:{value:x},uHeight:{value:R},uSize:{value:25},uSpeed:{value:1},uResolution:{value:new l},uEdgeColor:{value:new f(m.floorEdge)},uEdgeSize:{value:50}},vertexShader:`
    varying vec2 vUV;

    void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        vUV = uv;
    }
    `,fragmentShader:`
    precision mediump float;

    uniform sampler2D uTexture;
    uniform float uWidth;
    uniform float uHeight;
    uniform float uSize;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec3 uEdgeColor;
    uniform float uEdgeSize;

    varying vec2 vUV;

    void main() {
        float ratioW = uWidth / uSize;
        float ratioH = uHeight / uSize;

        vec2 pos = vec2(vUV.x * ratioW + uTime * 0.0010, vUV.y * ratioH - 0.3);
        vec4 edgeColor = vec4(uEdgeColor, 1.0);
        float internalResolution = (1.0 / uHeight);
        float isEdge = 1.0 - step(uEdgeSize * internalResolution * uResolution.y, 1.0 - vUV.y);

        gl_FragColor = mix(texture2D(uTexture, pos), edgeColor, isEdge);
    }
    `}));i.position.set(0,-R/2-k+g.y,0);const X=new A(new ce(k,80),new ue({color:m.ball})),p=pe(X,.8,new f(m.ball).multiplyScalar(.85));p.position.z=-5,p.position.set(g.x,g.y,0);const b=new E({color:m.gravityVector,...M});b.position.z=1,p.add(b);const C=new E({color:m.normalVector,...M});C.position.z=1,p.add(C);const T=new E({color:m.totalForceVector,...M});T.position.z=1,p.add(T),F.id&&fe(F.id).on(t=>h.value=t),Se(()=>{({camera:P,scene:d}=ge(u.value)),d.add(p,i);const e=new l(1/u.value.clientWidth*(window.devicePixelRatio||1),1/u.value.clientHeight*(window.devicePixelRatio||1));i.material.uniforms.uTexture={value:Y(new f(c.zinc[700]),new f(c.zinc[700]).multiplyScalar(1.25))},i.material.uniforms.uResolution={value:e},_=new I("F<sub>G</sub>",{cssClass:["font-sans","text-lg","md:text-2xl","font-semibold","text-rose-500"]}),d.add(_),_.position.set(10,S.y*b.options.scale,0),y=new I("F<sub>N</sub>",{cssClass:["font-sans","text-lg","md:text-2xl","font-semibold","text-teal-500"]}),d.add(y),y.position.set(30,-8,0);const t={step:1e-4,min:-45,max:45,width:x/2,height:u.value.clientHeight,sensitivity:8e4,axis:"both"};r=new $(n.value,t),r.afterDragUpdate(o=>{h.value=o,s.value=o}),r.position.x=-x/4,s=new $(n.value,{...t,yDirection:-1}),s.afterDragUpdate(o=>{h.value=o,r.value=o}),s.position.x=x/4,d.add(r,s),de([r,s],P,u.value),N(),J({el:u.value,scene:d,camera:P,tick:oe})});function Y(e,t){const o=document.createElement("canvas");o.width=100,o.height=100;const a=o.getContext("2d");return a.fillStyle=new f(e).getStyle(),a.fillRect(0,0,50,50),a.fillRect(50,50,50,50),a.fillStyle=new f(t).getStyle(),a.fillRect(50,0,50,50),a.fillRect(0,50,50,50),new me(o,void 0,G,G,j,j)}function N(){i.rotation.z=-n.value,i.position.x=B.value.x,i.position.y=B.value.y}function Z(){const e=D.value.length()*Math.sign(D.value.x);W+=e}function ee(){const e=new l(w.value.y,-w.value.x).normalize(),t=w.value.clone().multiplyScalar(C.options.scale).add(e.multiplyScalar(10));y.position.set(t.x,t.y,1)}function te(){h.value=0,r.value=0,s.value=0}q(n,N),q(z,e=>L.enabled=e);function oe(){i.material.uniforms.uTime={value:W},b.update(S),C.update(w.value),T.update(D.value),ee()}return(e,t)=>{const o=ne;return be(),Ce(we,{ref_key:"container",ref:U,modelValue:z.value,"onUpdate:modelValue":t[0]||(t[0]=a=>z.value=a),aspect:65,title:"Ball on a slope"},{default:Ve(()=>[Re(o,{"show-play-controls":!1,onReset:te})]),_:1},8,["modelValue"])}}});export{$e as default};
