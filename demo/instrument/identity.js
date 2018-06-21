const Acorn = require("acorn");
const Aran = require("aran");
const Astring = require("astring");
const AranAccess = require("aran-access");

const aran = Aran({namespace:"ADVICE"});
const instrument = (script, scope) => Astring.generate(aran.weave(
  Acorn.parse(script, {locations:true}),
  pointcut,
  {scope:scope, sandbox:true}));
const access = AranAccess({
  instrument: instrument,
  enter: (value) => value,
  leave: (value) => value
});
const pointcut = Object.keys(access.advice);
global.ADVICE = access.advice;
global.eval(Astring.generate(aran.setup()));
module.exports = (script, source) => instrument(script);