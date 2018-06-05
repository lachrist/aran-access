const Acorn = require("acorn");
const Aran = require("aran");
const Astring = require("astring");
const AranAccess = require("aran-access");

const aran = Aran({namespace:"ADVICE", sandbox:true});
const instrument = (script, scope) =>
    Astring.generate(aran.weave(Acorn.parse(script), pointcut, scope));
let counter = 0;
const access = AranAccess({
  instrument: instrument,
  enter: (value) => {
    let wrapper = {base:value, meta:++counter};
    let print = typeof value === "string" ? JSON.stringify : String;
    console.log("#"+counter+" << "+print(value));
    return wrapper;
  },
  leave: (value) => (console.log(">> #"+value.meta), value.base)
});
global.ADVICE = access.advice;
const pointcut = Object.keys(ADVICE);
global.eval(Astring.generate(aran.setup()));
module.exports = (script, source) => instrument(script);