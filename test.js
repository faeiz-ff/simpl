let f = ()=>a=>a;
f = (()=>f)();
f = f()(1);
console.log(f);