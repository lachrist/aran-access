const Acorn = require("acorn");
const Aran = require("aran");
const Astring = require("astring");
const AranAccess = require("aran-access");

let wrappers = new WeakSet();
const access = AranAccess({
  check: true,
  enter: (value) => {
    const wrapper = {inner:value};
    wrappers.add(wrapper);
    return wrapper;
  },
  leave: (wrapper) => {
    if (!wrappers.has(wrapper))
      throw new Error("Unwrapped value", wrapper);
    return wrapper.inner;
  }
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