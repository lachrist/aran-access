const Acorn = require("acorn");
const Aran = require("aran");
const Astring = require("astring");
const AranAccess = require("aran-access");

const access = AranAccess({
  check: true,
  enter: (value) => ({inner:value}),
  leave: (value) => value.inner
});
global.ADVICE = access.advice;

const aran = Aran({
  namespace: "ADVICE",
  sandbox: true,
  pointcut: Object.keys(ADVICE)
});
access.membrane.transform = (script, scope) =>
  Astring.generate(aran.weave(Acorn.parse(script, {locations:true}), scope));
global.eval(Astring.generate(aran.setup()));
module.exports = (script) => access.membrane.transform(script, ["this"]);