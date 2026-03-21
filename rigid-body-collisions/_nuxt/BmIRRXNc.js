const o=new Map;function p(e){return{on(t,s){typeof t=="string"?o.set(`${t}:${e}`,s):o.set(`update:${e}`,t)},emit(t,s){const n=o.get(`${t}:${e}`);n==null||n(s)}}}export{p as u};
