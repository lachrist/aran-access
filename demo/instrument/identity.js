const Acorn = require("acorn");
const Aran = require("aran");
const Astring = require("astring");
const AranAccessControl = require("aran-access-control");

const aran = Aran({namespace:"ADVICE", sandbox:true});
const instrument = (script, scope) =>
  Astring.generate(aran.weave(Acorn.parse(script), pointcut, scope));
const access = AranAccessControl({
  instrument: instrument,
  enter: (value) => value,
  leave: (value) => value
});
const pointcut = Object.keys(access.advice);
global.ADVICE = access.advice;
global.eval(Astring.generate(aran.setup()));
module.exports = (script, source) => instrument(script);