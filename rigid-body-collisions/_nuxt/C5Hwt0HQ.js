const s=new Map;function o(a,t){var e;s.has(a)||s.set(a,new Set),(e=s.get(a))==null||e.add(t)}function r(a,t,e){var n;(n=s.get(a))==null||n.forEach(c=>c(t,e))}export{o as a,r as u};
