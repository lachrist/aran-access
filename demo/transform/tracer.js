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
const access = AranAccess({
  check: true,
  enter: (value) => {
    console.log("ENTER", print(value));
    return value;
  },
  leave: (value) => {
    console.log("LEAVE", print(value));
    return value;
  }
});
global.ADVICE = {SANDBOX:access.advice.SANDBOX};
Object.keys(access.advice).filter((key) => key.toLowerCase() === key).forEach((key) => {
  ADVICE[key] = function () {
    const identity = counter++;
    console.log("BEGIN", "#"+identity, key, Array.from(arguments).map(print).join(" "));
    const result = Reflect.apply(access.advice[key], undefined, arguments);
    console.log("END  ", "#"+identity, key, print(result));
    return result;
  };
});

const aran = Aran({
  namespace: "ADVICE",
  sandbox: true,
  pointcut: Object.keys(ADVICE)
});
access.membrane.transform = (script, scope) =>
  Astring.generate(aran.weave(Acorn.parse(script, {locations:true}), scope));
global.eval(Astring.generate(aran.setup()));
module.exports = (script) => access.membrane.transform(script, ["this"]);