const Acorn = require("acorn");
const Aran = require("aran");
const Astring = require("astring");
const AranAccess = require("aran-access");

let counter = 0;
const print = (value) => {
  if (Array.isArray(value))
    return "[array]"
  if (typeof value === "object")
    return value ? "[object]" : "null";
  if (typeof value === "function")
    return "[function]";
  if (typeof value === "string")
    return JSON.stringify(value);
  return String(value);
};
const aran = Aran({namespace:"ADVICE", sandbox:true});
const instrument = (script, scope) =>
    Astring.generate(aran.weave(Acorn.parse(script), pointcut, scope));
const access = AranAccess({
  instrument: instrument,
  enter: (value) => {
    console.log("ENTER", print(value));
    return value;
  },
  leave: (value) => {
    console.log("LEAVE", print(value));
    return value;
  }
});
const pointcut = Object.keys(access.advice);
global.ADVICE = {};
pointcut.filter((key) => key.toLowerCase() === key).forEach((key) => {
  ADVICE[key] = function () {
    const identity = counter++;
    console.log("BEGIN", "#"+identity, key, Array.from(arguments).map(print).join(" "));
    const result = Reflect.apply(access.advice[key], undefined, arguments);
    console.log("END  ", "#"+identity, key, print(result));
    return result;
  };
});
ADVICE.SANDBOX = access.advice.SANDBOX;
global.eval(Astring.generate(aran.setup()));
module.exports = (script, source) => instrument(script);
