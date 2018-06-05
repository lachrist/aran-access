const Acorn = require("acorn");
const Aran = require("aran");
const Astring = require("astring");
const AranAccess = require("aran-access");

const aran = Aran({namespace:"ADVICE", sandbox:true});
const instrument = (script, scope) =>
    Astring.generate(aran.weave(Acorn.parse(script, {locations:true}), pointcut, scope));
const location = (serial) => "@"+aran.node(serial).loc.start.line;
const access = AranAccess({
  instrument: instrument,
  enter: (value) => value,
  leave: (value) => wrappers.has(value) ? value.base : value
});
let counter = 0;
const wrappers = new WeakSet();
const wrap = (base) => {
  const wrapper = {base:base,meta:"#"+(++counter)};
  wrappers.add(wrapper);
  return wrapper;
};
const print = (value) => {
  if (wrappers.has(value))
    return value.meta;
  if (typeof value === "string")
    return JSON.stringify(value);
  if (value && typeof value === "object")
    return "[object]";
  if (typeof value === "function")
    return "[function]";
  return String(value);
};
global.ADVICE = Object.assign({}, access.advice);
ADVICE.primitive = (primitive, serial) => {
  const result = wrap(access.advice.primitive(primitive, serial));
  console.log(result.meta+" = "+print(result.base)+" // "+location(serial));
  return result;
};
ADVICE.binary = (operator, value1, value2, serial) => {
  const result = wrap(access.advice.binary(operator, value1, value2, serial));
  console.log(result.meta+" = "+print(value1)+" "+operator+" "+print(value2)+" // "+location(serial));
  return result;
};
ADVICE.unary = (operator, value, serial) => {
  const result = wrap(access.advice.unary(operator, value, serial));
  console.log(result.meta+" = "+operator+" "+print(value)+" // "+location(serial));
  return result;
};
const pointcut = Object.keys(ADVICE);
global.eval(Astring.generate(aran.setup()));
module.exports = (script, source) => instrument(script);