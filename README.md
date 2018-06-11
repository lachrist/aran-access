# AranAccess

AranAccess is [npm module](https://www.npmjs.com/aran-access) that implements an access control system around JavaScript code instrumented by [Aran](https://github.com/lachrist/aran).
This module's motivation is to build dynamic analyses capable of tracking primitive values across the object graph.

## Getting Started

```sh
npm install acorn aran astring aran-access 
```

```js
const Acorn = require("acorn");
const Aran = require("aran");
const Astring = require("astring");
const AranAccess = require("aran-access");

const aran = Aran({namespace:"TRAPS", sandbox:true});
const instrument = (script, parent) =>
  Astring.generate(aran.weave(Acorn.parse(script), pointcut, parent));
let counter = 0;
const access = AranAccess({
  instrument: instrument,
  enter: (value) => ({concrete:value, shadow:"#"+(counter++)}),
  leave: (value) => value.concrete
});
const pointcut = Object.keys(access.advice);

global.TRAPS = Object.assign({}, access.advice);
global.TRAPS.primitive = (primitive, serial) => {
  const result = access.advice.primitive(primitive, serial);
  console.log(result.shadow+"("+result.concrete+") // @"+serial);
  return result;
};
global.TRAPS.binary = (operator, left, right, serial) => {
  const result = access.advice.binary(operator, left, right, serial);
  console.log(result.shadow+"("+result.concrete+") = "+left.shadow+" "+operator+" "+right.shadow+" // @"+serial);
  return result;
};

global.eval(Astring.generate(aran.setup()));
global.eval(instrument(`
let division = {};
division.dividend = 1 - 1;
division.divisor = 20 - 2 * 10;
division.result = division.dividend / division.divisor;
if (isNaN(division.result))
  console.log("!!!NaN division result!!!");
`));
```

```
#6(apply) // @2
#10(defineProperty) // @2
#14(getPrototypeOf) // @2
#18(keys) // @2
#22(iterator) // @2
#24(undefined) // @2
#26(dividend) // @6
#27(1) // @9
#28(1) // @10
#29(0) = #27 - #28 // @8
#30(divisor) // @12
#31(20) // @15
#32(2) // @17
#33(10) // @18
#34(20) = #32 * #33 // @16
#35(0) = #31 - #34 // @14
#36(result) // @20
#37(dividend) // @23
#38(divisor) // @25
#39(NaN) = #29 / #35 // @22
#42(result) // @30
#45(log) // @33
#46(!!!NaN division result!!!) // @35
!!!NaN division result!!!
```

## Demonstrators

* [demo/analysis/identity.js](https://cdn.rawgit.com/lachrist/aran-access/0f3d8063/demo/output/identity-delta.html)
  Demonstrate the API of this module but don't produce any observable effect.
* [demo/analysis/identity.js](https://cdn.rawgit.com/lachrist/aran-access/0f3d8063/demo/output/identity-wrapper-delta.html)
  Still don't produce any observable effect but wrap every values entering the system and unwrap them as they leave the system.
* [demo/analysis/tracer.js](https://cdn.rawgit.com/lachrist/aran-access/0f3d8063/demo/output/tracer-delta.html)
  Use an identity membranes and log every operations.
* [demo/analysis/wrapper](https://cdn.rawgit.com/lachrist/aran-access/0f3d8063/demo/output/wrapper-delta.html):
  Every values entering instrumented areas are wrapped to provide a well-defined identity.
  Every wrapper leaving instrumented areas are unwrapped so the behavior of the base program is not altered.
  Wrapping and unwrapping operations are logged.
* [demo/analysis/concolic](https://cdn.rawgit.com/lachrist/aran-access/0f3d8063/demo/output/concolic-delta.html):
  In this very simple concolic executer, primitive values from literal, binary and unary operations are all considered symbolic.
  Also use a wrapper membrane but overwrite a couple of traps to log data dependencies.
* [demo/analysis/dependency](https://cdn.rawgit.com/lachrist/aran-access/0f3d8063/demo/output/dependency-delta.html):
  Same as above but every traps is login the data flow.

## API

![catergory](img/category.png)

* A *wild value* is either:
  * a primitive
  * a reference which satisfies the below constraints:
    * its prototype is a wild value
    * the values of its data properties are wild values
    * the getters and setters of its accessor properties are wild values
    * applying it with a wild value this-argument and wild value arguments will return a wild value
    * constructing it with wild value arguments will return a wild value
* A *tame value* is either:
  * a primitive
  * a reference which satisfies the below constraints:
    * its prototype is a tame value.
    * the values of its data properties are inner values
    * the getters and setters of its accessor properties are tame values
    * applying it with a tame value this-argument and inner value arguments will return an inner value
    * constructing it with inner value arguments will return an inner value

### `access = require("aran-access")(membrane)`

* `membrane :: object`
  * `inner = membrane.enter(tame)`:
  User-defined function to convert a tame value to an inner value.
  * `tame = membrane.leave(inner)`:
  User-defined function to convert an inner value to a tame value.
  * `instrumented = membrane.instrument(code, serial)`:
  This function will be called to transforms code before passing it to the infamous `eval` function.
    * `code :: string`
    * `serial :: number`
    * `instrumented :: string`
* `access :: object`
  * `access.advice :: object`
  An aran advice, contains Aran traps and a `SANDBOX` field which is set to `access.capture(global)`.
  The user can modify the advice before leting aran using it.
  * `access.membrane :: object`:
  The same object as the membrane arguments.
  * `tame = access.capture(wild)`
  Convert a wild value into a tame value.
  * `wild = access.release(tame)`:
  Convert a tame value into a wild value.

## Discussion

[Aran](https://github.com/lachrist/aran) and program instrumentation in general is good for introspecting the control flow and pointers data flow.
Things become more difficult when reasoning about primitive value data flow is involved.
For instance, there is no way at the JavaScript language level to differentiate two `null` values even though they have different origins.
This restriction strikes every JavaScript primitive values because they are inlined into different parts of the program's state -- e.g the environment and the value stack.
All of these copying blur the concept of a primitive value's identity and lifetime.
By opposition, objects can be properly differentiated based on their address in the store.
Such situation happens in almost every mainstream programming languages.
We now discuss several strategies to provide an identity to primitive values:
* *Shadow States*:
  For low-level languages such as binary code, primitive values are often tracked by maintaining a so called "shadow state" that mirrors the concrete program state.
  This shadow state contains analysis-related information about the program values situated at the same location in the concrete state. 
  [Valgrind](http://valgrind.org/) is a popular binary instrumentation framework which utilizes this technique to enables many data-flow analyses.
  The difficulty of this technique lies in maintaining the shadow state as non-instrumented functions are being executed.
  In JavaScript this problem typically arises when objects are passed to non instrumented functions such as builtins.
  Keeping the shadow store in sync during such operation requires to know the exact semantic of the non-instrumented function. 
  Since they are so many different builtin functions in JavaScript, this is a very hard thing to do.
* *Record And Replay*:
  Record and replay systems such as [Jalangi](https://github.com/SRA-SiliconValley/jalangi) are an intelligent response to the challenge of keeping in sync the shadow state with its concrete state.
  Acknowledging that divergences between shadow and concrete states cannot be completely avoided, these systems allows divergences in the replay phase which can be recovered from by utilizing the trace gathered during the record phase.
  We propose two arguments against such technique:
  First, every time divergences are resolved in the replay phase, values with unknown origin are being introduced which necessarily diminish the precision of the resulting analysis.
  Second, the replay phase only provide information about partial execution which can be puzzling to reason about.
* *Wrappers*:
  Instead of providing an entire separated shadow state, wrappers constitute a finer grained solution.
  By wrapping primitive values inside objects we can simply let them propagate through the data flow of the base program.
  The challenge introduced by wrappers is to make them behave like their wrapped primitive value to non-instrumented code.
  We explore three solutions to this challenge:
  * *Boxed Values*:
    JavaScript enables to box booleans, numbers and strings.
    Despite that symbols, `undefined` and `null` cannot be tracked by this method, boxed values do not always behave like their primitive counterpart within builtins.    
    ```js
    // Strings cannot be differentiated based on their origin
    let string1 = "abc";
    let string2 = "abc";
    assert(string1 === string2);
    // Boxed strings can be differentiated based on their origin
    let boxed_string1 = new String("abc");
    let boxed_string2 = new String("abc");
    assert(boxed_string1 !== boxed_string2);
    // Boxed value behave as primitive in some builtins: 
    assert(JSON.stringify({a:string1}) === JSON.stringify({a:boxed_string1}));
    // In others, they don't...
    let error
    try {
      Object.defineProperty(string1, "foo", {value:"bar"});
    } catch (e) {
      error = e;
    }
    assert(error);
    Object.defineProperty(boxed_string1, "foo", {value:"bar"});
    ```
  * *`valueOf` Method*:
    A similar mechanism to boxed value is to use the `valueOf` method.
    Many JavaScript builtins expecting a primitive value but receiving an object will try to convert this object into a primitive using its `valueOf` method.
    As for boxed values this solution is not bullet proof and there exists many cases where the `valueOf` method will not be invoked.
  * *Explicit Wrappers*:
    Finally a last options consists in using explicit wrappers which should be cleaned up before escaping to non-instrumented code.
    This requires to setup an access control system between instrumented code and non-instrumented code.
    This the solution this module directly enables.

## Acknowledgments

I'm [Laurent Christophe](http://soft.vub.ac.be/soft/members/lachrist) a phd student at the Vrij Universiteit of Brussel (VUB).
I'm working at the SOFT language lab in close relation with my promoters [Coen De Roover](http://soft.vub.ac.be/soft/members/cderoove) and [Wolfgang De Meuter](http://soft.vub.ac.be/soft/members/wdmeuter).
I'm currently being employed on the [Tearless](http://soft.vub.ac.be/tearless/pages/index.html) project.

<!-- Improvements ideas:
Provide a much more fine grained membrane definition.
This membrane can easily express the actual membrane and is symetric.
I suspect I will be able to use a single foreign file instead of generating the dual.
```
membrane = {
  instrument: (script, serial) => ...,
  enter_primitive: (primitive) => ...,
  enter_native_wild: (native_wild) => ...,
  enter_native_tame: (native_tame) => ...,
  leave_wild: (inner) => ...,
  leave_tame: (inner) => ...,
};
```
 -->

<!-- 
1. **Debugging NaN appearances**
  In this first example, we want to provide an analysis which tracks the origin of `NaN` (not-a-number) values.
  The problem with `NaN` values is that they can easily propagate as the program is executed such that detecting the original cause of a `NaN` appearance is often tedious for large programs.
  Consider the program below which alerts "Your age is: NaN".
  ```js
  var year = Number(document.getElementById("bdate").avlue);
  // many lines with many unrelated NaNs appearances
  alert("Your age is: " + (2016 - year));
  ```
  Simply printing every appearance of `NaN` values runs under the risk of overwhelming the programmer with unrelated `NaN` appearances.
  We would like to know only of the `NaN` that caused the alert to display an buggy message.
  It is therefore crucial to differentiate `NaN` values which cannot be done at the JavaScript language level.

2. **Taint analysis**
  Taint analysis consists in marking -- or *tainting* -- values coming from predefined source of information and preventing them from flowing through predefined sinks of information.
  As tainted values are manipulated through the program, the taint should be properly propagated to dependent values. 
  ```js
  var password = document.getElementById("password"); // predefined source
  var secret = password.value; // tainted string
  var secrets = secret.split(""); // array of tainted characters
  sendToShadyThirdPartyServer(secrets); // predefined sink
  ```
  Lets suppose that the password was `"trustno1"`.
  N.B. strings are primitive values in JavaScript.
  After splitting this string to characters we cannot simply taint all string being `"t"`, `"r"`, `"u"`, `"s"`, `"t"`, "`n`", "`o`", `"1"`.
  This would lead to serious over-tainting and diminish the precision and usefulness of the analysis.
  As for the `Nan` debugger we crucially need to differentiate primitive values based on their origin and not only their value.

3. **Concolic Testing**
  Concolic testing aims at automatically exploring all the control-flow paths a program can take for validation purpose.
  It involves gathering mathematic formula on a program's inputs as it is being executed.
  Later, these formula can be given to a constraint solver to steer the program into a unexplored execution path.
  Consider the program below which has two different outcomes based on the birthdate of the user.
  A successful concolic tester should be able to generate an birthdate input that leads the program to the consequent branch and an other birthdate input that leads the program to the alternate branch.
  ```js
  var input = document.getElemenById("bdate").value;
  var bdate = input.value // new symbolic value [α]
  var age = bdate - 2016; // new constraint [β = α - 2016]
  var isminor = age > 17; // new constraint [γ = β > 17]
  if (isminor) {          // path condition [γ && γ = β > 17 && β = α - 2016]
    // do something
  } else {                // path condition [!γ && γ = β > 17 && β = α - 2016]
    // do something else
  }
  ```
  It should be clear that confusing two primitive values having different origin would easily lead to erroneous path constraint.
 -->