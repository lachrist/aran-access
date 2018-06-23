const Acorn = require("acorn");
const Aran = require("aran");
const Astring = require("astring");
const AranAccess = require("aran-access");

let counter1 = 0;
let counter2 = 0;
let pointers = new WeakMap();

const print = (value) => {
  if (value && typeof value === "object" || typeof value === "function") {
    let pointer = pointers.get(value);
    if (!pointer) {
      pointer = ++counter1;
      pointers.set(value, pointer);
    }
    return "&" + pointer;
  }
  if (typeof value === "string")
    return JSON.stringify(value);
  return String(value);
};

const transform = (script, scope) => Astring.generate(aran.weave(
  Acorn.parse(script, {locations:true}),
  pointcut,
  {scope:scope, sandbox:true}));

const access = AranAccess({
  enter: (value) => ({base:value, meta:"#"+(++counter2)}),
  leave: (wrapper) => wrapper.base,
  transform: transform
});

const pointcut = Object.keys(access.advice);

const location = (serial) => aran.node(serial).loc.start.line;

global.ADVICE = {SANDBOX:access.advice.SANDBOX};

///////////////
// Producers //
///////////////
const make_scope_trap = (name) => (strict, scope, serial) => {
  scope = access.advice[name](strict, scope, serial);
  if (scope) {
    for (var key in scope) {
      console.log(scope[key].meta+" = "+name+"-"+key+"("+strict+", "+print(scope[key].base)+") "+location(serial));
    }
  }
  return scope;
};
ADVICE.begin = make_scope_trap("begin");
ADVICE.arrival = make_scope_trap("arrival");
["catch", "primitive", "discard", "regexp", "closure"].forEach((name) => {
  ADVICE[name] = function () {
    const result = access.advice[name].apply(null, arguments);
    arguments[arguments.length-2] = print(arguments[arguments.length-2]);
    arguments.length--;
    arguments.join = Array.prototype.join;
    console.log(result.meta+" = "+name+"("+arguments.join(", ")+") "+location(arguments[arguments.length]));
    return result;
  };
});

///////////////
// Consumers //
///////////////
["return", "throw", "success", "test", "eval", "with"].forEach((name) => {
  ADVICE[name] = function () {
    const result = access.advice[name].apply(null, arguments);
    arguments[arguments.length-2] = arguments[arguments.length-2].meta;
    arguments.length--;
    arguments.join = Array.prototype.join;
    console.log(name+"("+arguments.join(", ")+") "+location(arguments[arguments.length]));
    return result;
  };
});

///////////////
// Combiners //
///////////////
const metaof = (value) => value.meta;
const combine = (result, name, origin, serial) => {
  console.log(result.meta+" = "+name+"("+origin+") "+location(serial)+" // "+print(result.base));
  return result;
};
ADVICE.apply = (value, values, serial) => combine(
  access.advice.apply(value, values, serial),
  "apply", value.meta+", ["+values.map(metaof)+"]", serial);
ADVICE.invoke = (value1, value2, values, serial) => combine(
  access.advice.invoke(value1, value2, values, serial),
  "invoke", value1.meta+", "+value2.meta+", ["+values.map(metaof)+"]", serial);
ADVICE.construct = (value, values, serial) => combine(
  access.advice.construct(value, values, serial),
  "construct", value.meta+", ["+values.map(metaof)+"]", serial);
ADVICE.get = (value1, value2, serial) => combine(
  access.advice.get(value1, value2, serial),
  "get", value1.meta+", "+value2.meta, serial);
ADVICE.set = (value1, value2, value3, serial) => combine(
  access.advice.set(value1, value2, value3, serial),
  "set", value1.meta+", "+value2.meta+", "+value3.advice, serial);
ADVICE.delete = (value1, value2, serial) => combine(
  access.advice.delete(value1, value2, serial),
  "delete", value1.meta+", "+value2.meta, serial);
ADVICE.array = (value, serial) => combine(
  access.advice.array(value.slice(), serial),
  "array", "["+value.map(metaof)+"]", serial);
ADVICE.object = (keys, value, serial) => combine(
  access.advice.object(keys, value, serial),
  "object", "{"+keys.map((key) => JSON.stringify(key)+":"+value[key].meta)+"}", serial);
ADVICE.unary = (operator, value, serial) => combine(
  access.advice.unary(operator, value, serial),
  "unary", "\""+operator+"\", "+value.meta, serial);
ADVICE.binary = (operator, value1, value2, serial) => combine(
  access.advice.binary(operator, value1, value2, serial),
  "binary", "\""+operator+"\", "+value1.meta+", "+value2.meta, serial);

const aran = Aran({namespace:"ADVICE", sandbox:true});
global.eval(Astring.generate(aran.setup()));
module.exports = (script) => transform(script, ["this"]);