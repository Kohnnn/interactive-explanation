import{_ as m}from"./DX6m-V_Y.js";import f from"./2e85zL9q.js";import{_ as p}from"./KNSBG8MS.js";import{K as s}from"./rqsyROxV.js";import{t as o}from"./Xcv7L_A9.js";import{s as _}from"./Dx-4tT8e.js";import{u as h}from"./D7Zn8WGp.js";import{c as x}from"./DKWtBtuP.js";import u from"./DzCU1B1e.js";import{f as g,r as b,g as D,h as y,i as w,j as F,o as q,c as M,a as c,b as i,w as N,F as P}from"./D4VqJVMa.js";import"./BagbhlbM.js";import"./BC46-FXa.js";import"./DlAUqK2U.js";import"./C5niFfd0.js";import"./DW5zXwZv.js";import"./C-o7K-hX.js";import"./B3eSfqzP.js";import"./DCNwxxqA.js";import"./C-v3KzvZ.js";import"./Dnd51l0P.js";import"./pU7TT3IV.js";import"./BfCDwJmq.js";import"./DSQiaBBK.js";import"./bHzPANiV.js";import"./C5Hwt0HQ.js";import"./Cpj98o6Y.js";import"./bPvl3H-i.js";const V={velocity:{tex:"\\vec{v} = \\frac{\\vec{s}}{\\Delta t}",title:"Velocity as displacement over time"},displacement:{tex:"\\vec{s} = \\vec{v}_{current} \\cdot \\Delta t"},positionNew:{tex:"pos_{new} = pos_{old} + \\vec{s}"},newVelocitiesEquations:{tex:`
    \\begin{aligned}
    \\vec{v}_{a,f} &= \\vec{v}_{a,i} + \\Delta \\vec{v}_a \\\\
    \\vec{v}_{b,f} &= \\vec{v}_{b,i} + \\Delta \\vec{v}_b \\\\
    \\end{aligned}
    `},dotProduct:{tex:"\\vec{a} \\cdot \\vec{b} = a_xb_x + a_yb_y",title:"The 2D vector dot product"},projectionLength:{tex:"s = \\|\\vec{a}\\| \\cos\\theta"},cosineDefinition:{tex:"\\cos \\theta = \\frac{\\text{adj}}{\\text{hyp}}",numbered:!1},cosineDefinitionWithVectors:{tex:"\\cos \\theta = \\frac{\\Green{s}}{\\Blue{\\| \\vec{a} \\|}}",numbered:!1},cosineDefinitionSolvedForAdj:{tex:"\\Green{s} = \\Blue{\\| \\vec{a} \\|} \\cos \\theta",numbered:!1},dotProductProjection:{tex:"\\vec{a} \\cdot \\hat{b} = \\| \\vec{a} \\| \\cos\\theta"},vectorDecomposition:{tex:"\\vec{b} = \\hat{b} \\, \\| \\vec{b} \\|",title:"Writing a vector in terms of its unit vector and magnitude"},dotProductGeometric:{tex:"\\vec{a} \\cdot \\vec{b} = \\| \\vec{a} \\| \\, \\|\\vec{b}\\|\\cos\\theta",title:"Geometric definition of the 2D vector dot product"},dotProductUnitVectors:{tex:`
    \\begin{aligned}
    \\hat{a} \\cdot \\hat{b} &= \\| \\hat{a} \\|\\ \\|\\hat{b}\\| \\cos\\theta \\\\
    &= 1 \\cdot 1 \\cdot \\cos\\theta \\\\
    &= \\cos\\theta
    \\end{aligned}
    `},dotProductSelf:{tex:`
    \\begin{aligned}
    \\vec{a} \\cdot \\vec{a} &= \\| \\vec{a} \\|\\ \\|\\vec{a}\\| \\cos\\theta \\\\
    &= \\|\\vec{a}\\|^2 \\cos(0) \\\\
    &= \\|\\vec{a}\\|^2 \\cdot 1 \\\\
    &= \\|\\vec{a}\\|^2
    \\end{aligned}
    `},vectorLengthExample:{tex:`
    \\begin{aligned}
    \\|\\vec{v}\\| &= \\sqrt{\\vec{v}_x^2 + \\vec{v}_y^2} \\\\
    &= \\sqrt{4^2 + 3^2} \\\\
    &= \\sqrt{25} \\\\
    &= 5
    \\end{aligned}
    `},normalizeVectorExample:{tex:`
    \\begin{aligned}
    \\hat{v}_x &= \\frac{\\vec{v}_x}{\\|\\vec{v}\\|} \\quad &\\hat{v}_y &= \\frac{\\vec{v}_y}{\\|\\vec{v}\\|} \\\\
    \\hat{v}_x &= \\frac{4}{5} \\quad &\\hat{v}_y &= \\frac{3}{5} \\\\
    \\hat{v}_x &= 0.8 \\quad &\\hat{v}_y &= 0.6
    \\end{aligned}
    `},relativeVelocity:{tex:"\\vec{v}_{ab} = \\vec{v}_a - \\vec{v}_b",title:"Relative velocity of two bodies"},relativeVelocityDotNormal:{tex:"\\vec{v}_{ab} \\cdot \\hat{n} = (\\vec{v}_a - \\vec{v}_b) \\cdot \\hat{n}",title:"The 'relative normal velocity' of two bodies"},accelerationVelocity:{tex:"\\vec{a} = \\frac{\\Delta \\vec{v}}{\\Delta t}",title:"Acceleration as change in velocity over time"},acceleration:{tex:"\\vec{a} = \\frac{\\vec{F}}{m}"},newton2:{tex:"\\vec{F} = m\\vec{a}",title:"Newton's second law of motion"},forceExpanded:{tex:"\\vec{F} = m\\frac{\\Delta \\vec{v}}{\\Delta t}"},newton2SolvedForVelocity:{tex:"\\Delta \\vec{v} = \\frac{\\vec{F} \\Delta t}{m}"},impulse:{tex:"\\vec{F} \\Delta t = m \\Delta v"},momentum:{tex:"\\vec{p} = m \\vec{v}",title:"Momentum as mass times velocity"},deltaMomentum1:{tex:"\\frac{\\Delta \\vec{p}}{\\Delta t} = \\frac{\\Delta (m \\vec{v})}{\\Delta t}"},deltaMomentum2:{tex:"\\frac{\\Delta \\vec{p}}{\\Delta t} = m \\frac{\\Delta \\vec{v}}{\\Delta t}"},deltaMomentum3:{tex:"\\frac{\\Delta \\vec{p}}{\\Delta t} = m \\vec{a}"},forceMomentum:{tex:"\\vec{F} = \\frac{\\Delta \\vec{p}}{\\Delta t}",title:"Force as change in momentum over time"},impulseMomentum:{tex:"\\vec{F} \\Delta t = \\Delta \\vec{p} = m \\Delta \\vec{v}"},impulseDefinition:{tex:"\\vec{J} = \\vec{F} \\Delta t",title:"Impulse from applying a constant force over time"},newton3:{tex:"\\vec{F}_{A \\rightarrow B} = -\\vec{F}_{B \\rightarrow A}",title:"Newton's third law of motion"},coefficientOfRestitution:{tex:"\\epsilon = \\frac{\\|(\\vec{v}_{a,f} - \\vec{v}_{b,f})\\|}{\\| (\\vec{v}_{a,i} - \\vec{v}_{b,i}) \\|} = \\frac{\\| \\vec{v}_{ab,f} \\|}{\\| \\vec{v}_{ab,i} \\|}",title:"The coefficient of restitution"},coefficientOfRestitutionSolvedForPostCollision:{tex:"\\| \\vec{v}_{ab,f} \\| = \\epsilon \\| \\vec{v}_{ab,i} \\|"},coefficientOfRestitutionNormalWrong:{tex:"\\vec{v}_{ab,f} \\cdot \\hat{n} = \\epsilon \\, \\vec{v}_{ab,i} \\cdot \\hat{n}",numbered:!1},coefficientOfRestitutionNormalCorrect:{tex:"\\vec{v}_{ab,f} \\cdot \\hat{n} = -\\epsilon \\, \\vec{v}_{ab,i} \\cdot \\hat{n}",title:"The coefficient of restitution expressed in terms of the pre- and post-collision relative normal velocities"},relateRelativeNormalVelocities:{tex:"\\vec{v}_{ab,f} \\cdot \\hat{n} = -e \\vec{v}_{ab,i} \\cdot \\hat{n}",title:"Relating the pre- and post-collision relative normal velocities"},vPrime:{tex:"\\vec{v,f} = \\vec{v,i} + \\Delta \\vec{v}"},vPrimeA:{tex:"\\vec{v}_{a,f} = \\vec{v}_{a,i} + \\Delta \\vec{v}_a"},vPrimeB:{tex:"\\vec{v}_{b,f} = \\vec{v}_{b,i} + \\Delta \\vec{v}_b"},newton2General:{tex:"\\frac{\\Delta \\vec{p}}{\\Delta t} = \\frac{\\Delta (m \\vec{v})}{\\Delta t}"},newton2ConstantMass:{tex:"\\frac{\\Delta \\vec{p}}{\\Delta t} = m \\frac{\\Delta \\vec{v}}{\\Delta t}"},momentumMassAcceleration:{tex:"\\frac{\\Delta \\vec{p}}{\\Delta t} = m \\vec{a}"},newton2GeneralExpanded:{tex:"\\vec{F} = \\frac{\\Delta (mv)}{\\Delta t} = m \\frac{\\Delta \\vec{v}}{\\Delta t} + v \\frac{\\Delta m}{\\Delta t}"},vectorLength:{tex:`
    \\begin{aligned}
    \\|\\vec{v}\\| &= \\sqrt{\\vec{v}_x^2 + \\vec{v}_y^2} \\\\
    &= \\sqrt{4^2 + 3^2} \\\\
    &= \\sqrt{25} \\\\
    &= 5
    \\end{aligned}
    `},normalizeVector:{tex:`
    \\begin{aligned}
    \\hat{v}_x &= \\frac{\\vec{v}_x}{\\|\\vec{v}\\|} \\quad &\\hat{v}_y &= \\frac{\\vec{v}_y}{\\|\\vec{v}\\|} \\\\
    \\hat{v}_x &= \\frac{4}{5} \\quad &\\hat{v}_y &= \\frac{3}{5} \\\\
    \\hat{v}_x &= 0.8 \\quad &\\hat{v}_y &= 0.6
    \\end{aligned}
    `},dotProductExpanded:{tex:`
    \\begin{aligned}
    \\vec{v} \\cdot \\vec{v} &= v_x v_x + v_y v_y \\\\
                             &= v_x^2 + v_y^2
    \\end{aligned}
    `},dotProductPythagoras:{tex:`
    \\begin{aligned}
        c &= \\sqrt{a^2 + b^2} \\\\
        c\\smash{^2} &= a^2 + b^2
    \\end{aligned}
    `},dotProductNormalVectorSelf:{tex:`
    \\begin{aligned}
    \\hat{v} \\cdot \\hat{v} &= 1^2 \\\\
                             &= 1
    \\end{aligned}
    `},reactionForce:{tex:"\\vec{F}_{N} = (\\vec{F}_{push} \\cdot \\hat{n})\\hat{n}"}},k={class:"flex items-center space-x-4 pt-4 md:pt-6 relative z-20"},S={href:"/",class:"text-gray-900 dark:text-white w-8 h-8"},B={class:"pb-20"},E={class:"md:pt-24 pt-12 font-serif prose xl:prose-lg prose-slate dark:prose-invert mx-auto prose-h1:font-serif prose-h1:font-light prose-h1:tracking-tight prose-h2:underline-none prose-h2:text-center prose-h2:font-heading prose-h2:font-medium prose-h2:tracking-tight prose-h2:uppercase prose-h2:text-2xl md:prose-h2:text-3xl prose-h3:font-heading prose-h3:font-bold prose-h3:uppercase w-full"},ve=g({__name:"[id]",setup(L){const{registerEquations:l}=h();l(V);let e;const a=b({angle:"degrees"});return D(()=>{_(),e=new MutationObserver(v=>{for(const t of v)t.type==="attributes"&&t.attributeName==="class"&&s({darkMode:t.target.classList.contains("dark")})});const n=document.querySelector("body");e.observe(n,{attributes:!0}),s({darkMode:n.classList.contains("dark"),colors:{dark:{grid:o.slate[700],axis:o.slate[600],units:o.slate[600],labelBackground:`${o.slate[900]}dd`}}});const r=localStorage.getItem("collision.wav-resolution");r&&Object.assign(a,JSON.parse(r))}),y(a,()=>localStorage.setItem("collision.wav-resolution",JSON.stringify(a))),w(x,a),F(()=>e==null?void 0:e.disconnect()),(n,r)=>{const v=m,t=f,d=p;return q(),M(P,null,[c("header",k,[c("a",S,[i(u,{class:"w-8 h-8"})])]),c("main",B,[i(d,null,{default:N(()=>[i(v,{class:"inline-flex fixed top-6 md:top-8 right-6 md:right-12 z-20"}),c("div",E,[i(t)])]),_:1})])],64)}}});export{ve as default};
