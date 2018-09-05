const Acorn = require("acorn");
const Aran = require("aran");
const Astring = require("astring");
const AranAccess = require("aran-access");

let counter = 0;
const wrappers = new WeakMap();
const access = AranAccess({
  check: true,
  enter: (value) => {
    if (value && typeof value === "object" || typeof value === "function") {
      var wrapper = wrappers.get(value);
      if (!wrapper) {
        wrapper = {base:value, meta:++counter};
        console.log("#"+counter+" << ["+(typeof value)+"]");
        wrappers.set(value, wrapper);
      }
    } else {
      var wrapper = {base:value, meta:++counter};
      let print = typeof value === "string" ? JSON.stringify : String;
      console.log("#"+counter+" << "+print(value));
    }
    return wrapper;
  },
  leave: (value) => (console.log(">> #"+value.meta), value.base)
});

const aran = Aran({
  namespace: "ADVICE",
  sandbox: true,
  pointcut: Object.keys(access.advice)
});
global.ADVICE = access.advice;
access.membrane.transform = (script, scope) =>
  Astring.generate(aran.weave(Acorn.parse(script, {locations:true}), scope));
global.eval(Astring.generate(aran.setup()));
module.exports = (script) => access.membrane.transform(script, ["this"]);