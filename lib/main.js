
const WildProxyHandlers = require("./wild-proxy-handlers.js");
const TameProxyHandlers = require("./tame-proxy-handlers.js");
const Region = require("./region.js");

const Error = global.Error;
const String = global.String;
const eval = global.eval;
const Object_create = Object.create;
const Symbol_iterator = Symbol.iterator;
const Array_isArray = Array.isArray;

const Reflect_apply = Reflect.apply;
const Reflect_construct = Reflect.construct;
const Reflect_defineProperty = Reflect.defineProperty;
const Reflect_deleteProperty = Reflect.deleteProperty;
const Reflect_get = Reflect.get;
const Reflect_getOwnPropertyDescriptor = Reflect.getOwnPropertyDescriptor;
const Reflect_getPrototypeOf = Reflect.getPrototypeOf;
const Reflect_has = Reflect.has;
const Reflect_isExtensible = Reflect.isExtensible;
const Reflect_preventExtensions = Reflect.preventExtensions;
const Reflect_ownKeys = Reflect.ownKeys;
const Reflect_set = Reflect.set;
const Reflect_setPrototypeOf = Reflect.setPrototypeOf;

module.exports = (membrane) => {

  const advice = {};

  const access = ((() => {
    const tame = Region();
    const wild = Region();
    tame.resolve_native_external_objects(wild.native_internal_objects);
    wild.resolve_native_external_objects(tame.native_internal_objects);
    tame.resolve_proxy_handlers(TameProxyHandlers(membrane, wild.internal_value_of, tame.internal_value_of));
    wild.resolve_proxy_handlers(WildProxyHandlers(membrane, tame.internal_value_of, wild.internal_value_of));
    global.INSPECT = advice.INSPECT;
    return {
      capture: tame.internal_value_of,
      release: wild.internal_value_of,
      inspect:  (value) => {
        const native_wild = wild.native_internal_objects.get(value);
        if (native_wild)
          return {wild:native_wild};
        const native_tame = tame.native_internal_objects.get(value);
        if (native_tame)
          return {tame:native_tame};
        if (value !== null && typeof value === "object" || typeof value === "function")
          return {unknown:value};
        return {primitive:value};
      }
    };
  }) ());

  const capture = access.capture;
  
  const release = access.release;

  advice.SANDBOX = capture(global);

  ///////////////
  // Producers //
  ///////////////
  advice.arrival = (strict, _scope, serial) => {
    const _arguments = _scope.arguments;
    _scope.arguments.length = membrane.enter(_scope.arguments.length);
    _scope.arguments[Symbol_iterator] = membrane.enter(capture(_scope.arguments[Symbol_iterator]));
    if (!strict)
      _scope.arguments.callee = membrane.enter(_scope.callee);
    Reflect_setPrototypeOf(_scope.arguments, capture(Reflect_getPrototypeOf(_scope.arguments)));
    if (_scope.new)
      Reflect_setPrototypeOf(_scope.this, membrane.leave(Reflect_getPrototypeOf(_scope.this)));
    if (_scope.this === global)
      _scope.this = capture(global);
    return {
      new: membrane.enter(_scope.new),
      callee: membrane.enter(_scope.callee),
      this: membrane.enter(_scope.this),
      arguments: membrane.enter(_scope.arguments)
    };
  };
  advice.begin = (strict, scope, serial) => {
    if (scope) {
      for (let key in scope) {
        scope[key] = membrane.enter(capture(scope[key]));
      }
    }
    return scope;
  };
  advice.catch = (value, serial) => membrane.enter(capture(value));
  advice.primitive = (value, serial) => membrane.enter(value);
  advice.discard = (identifier, value, serial) => membrane.enter(value);
  advice.regexp = (value, serial) => membrane.enter(capture(value));
  advice.closure = (_value, serial) => {
    Reflect_defineProperty(_value, "length", {
      value: membrane.enter(_value.length),
      writable: false,
      enumerable: false,
      configurable: true
    });
    Reflect_defineProperty(_value, "name", {
      value: membrane.enter(_value.name),
      writable: false,
      enumerable: false,
      configurable: true
    });
    Reflect_setPrototypeOf(_value, capture(Reflect_getPrototypeOf(_value)));
    if (!("prototype" in _value))
      return membrane.enter(value);
    $$value = membrane.enter(_value);
    Reflect_setPrototypeOf(_value.prototype, capture(Reflect_getPrototypeOf(_value.prototype)));
    _value.prototype.constructor = $$value;
    _value.prototype = membrane.enter(_value.prototype);
    return $$value;
  };

  ///////////////
  // Consumers //
  ///////////////
  advice.return = ($scope, $$value, serial) => {
    if (membrane.leave($scope.new)) {
      const $value = membrane.leave($$value);
      if (!$value || (typeof $value !== "object" && typeof $value !== "function"))
        return $scope.this;
    }
    return $$value;
  };
  advice.throw = ($$value, serial) => release(membrane.leave($$value));
  advice.success = ($scope, $$value, serial) => $scope ? release(membrane.leave($$value)) : $$value;
  advice.test = ($$value, serial) => membrane.leave($$value);
  advice.eval = ($$value, serial) => {
    if ("transform" in membrane)
      return membrane.transform(String(release(membrane.leave($$value))), serial);
    throw new Error("membrane.transform must be defined to support direct eval calls");
  };
  advice.with = ($$value, serial) => membrane.leave($$value);

  ///////////////
  // Combiners //
  ///////////////
  advice.apply = ($$value, array$$value, serial) => {
    switch (array$$value.length) {
      case 0: return membrane.leave($$value)();
      case 1: return membrane.leave($$value)(array$$value[0]);
      case 2: return membrane.leave($$value)(array$$value[0], array$$value[1]);
      case 3: return membrane.leave($$value)(array$$value[0], array$$value[1], array$$value[2]);
    }
    return Reflect_apply(membrane.leave($$value), void 0, array$$value);
  };
  advice.invoke = ($$value1, $$value2, array$$value, serial) => Reflect_apply(
    membrane.leave(advice.get($$value1, $$value2, serial)),
    membrane.leave($$value1),
    array$$value);
  advice.construct = ($$value, array$$value, serial) => {
    switch (array$$value.length) {
      case 0: return new (membrane.leave($$value))();
      case 1: return new (membrane.leave($$value))(array$$value[0]);
      case 2: return new (membrane.leave($$value))(array$$value[0], array$$value[1]);
      case 3: return new (membrane.leave($$value))(array$$value[0], array$$value[1], array$$value[2]);
    }
    return Reflect_construct(membrane.leave($$value), array$$value);
  };
  advice.get = ($$value1, $$value2, serial) => {
    const $value1 = membrane.leave($$value1);
    const value2 = release(membrane.leave($$value2));
    return (
      (
        $value1 &&
        (typeof $value1 === "object" || typeof $value1 === "function") &&
        (!Array_isArray($value1) || String(value2) !== "length")) ?
      $value1[value2] :
      membrane.enter(capture($value1[value2]))); 
  };
  advice.set = ($$value1, $$value2, $$value3, serial) => {
    const $value1 = membrane.leave($$value1);
    const value2 = release(membrane.leave($$value2));
    $value1[value2] = Array_isArray($value1) && String(value2) === "length" ? release(membrane.leave($$value3)) : $$value3;
    return $$value3;
  };
  advice.delete = ($$value1, $$value2) => membrane.enter(delete membrane.leave($$value1)[release(membrane.leave($$value2))]);
  advice.array = ($value, serial) => {
    Reflect_setPrototypeOf($value, capture(Reflect_getPrototypeOf($value)));
    return membrane.enter($value);
  };
  advice.object = (keys, $value, serial) => {
    Reflect_setPrototypeOf($value, capture(Reflect_getPrototypeOf($value)));
    return membrane.enter($value);
  };
  advice.unary = (operator, $$value, serial) => {
    switch (operator) {
      case "-":      return membrane.enter(-      release(membrane.leave($$value)));
      case "+":      return membrane.enter(+      release(membrane.leave($$value)));
      case "!":      return membrane.enter(!      release(membrane.leave($$value)));
      case "~":      return membrane.enter(~      release(membrane.leave($$value)));
      case "typeof": return membrane.enter(typeof release(membrane.leave($$value)));
      case "void":   return membrane.enter(void   release(membrane.leave($$value)));
    }
    throw new Error("Unknown unary operator: "+operator);
  };
  advice.binary = (operator, $$value1, $$value2, serial) => {
    switch (operator) {
      case "==":  return membrane.enter(release(membrane.leave($$value1)) ==  release(membrane.leave($$value2)));
      case "!=":  return membrane.enter(release(membrane.leave($$value1)) !=  release(membrane.leave($$value2)));
      case "===": return membrane.enter(release(membrane.leave($$value1)) === release(membrane.leave($$value2)));
      case "!==": return membrane.enter(release(membrane.leave($$value1)) !== release(membrane.leave($$value2)));
      case "<":   return membrane.enter(release(membrane.leave($$value1)) <   release(membrane.leave($$value2)));
      case "<=":  return membrane.enter(release(membrane.leave($$value1)) <=  release(membrane.leave($$value2)));
      case ">":   return membrane.enter(release(membrane.leave($$value1)) >   release(membrane.leave($$value2)));
      case ">=":  return membrane.enter(release(membrane.leave($$value1)) >=  release(membrane.leave($$value2)));
      case "<<":  return membrane.enter(release(membrane.leave($$value1)) <<  release(membrane.leave($$value2)));
      case ">>":  return membrane.enter(release(membrane.leave($$value1)) >>  release(membrane.leave($$value2)));
      case ">>>": return membrane.enter(release(membrane.leave($$value1)) >>> release(membrane.leave($$value2)));
      case "+":   return membrane.enter(release(membrane.leave($$value1)) +   release(membrane.leave($$value2)));
      case "-":   return membrane.enter(release(membrane.leave($$value1)) -   release(membrane.leave($$value2)));
      case "*":   return membrane.enter(release(membrane.leave($$value1)) *   release(membrane.leave($$value2)));
      case "/":   return membrane.enter(release(membrane.leave($$value1)) /   release(membrane.leave($$value2)));
      case "%":   return membrane.enter(release(membrane.leave($$value1)) %   release(membrane.leave($$value2)));
      case "|":   return membrane.enter(release(membrane.leave($$value1)) |   release(membrane.leave($$value2)));
      case "^":   return membrane.enter(release(membrane.leave($$value1)) ^   release(membrane.leave($$value2)));
      case "&":   return membrane.enter(release(membrane.leave($$value1)) &   release(membrane.leave($$value2)));
      case "in":  return membrane.enter(release(membrane.leave($$value1)) in  release(membrane.leave($$value2)));
      case "instanceof": return membrane.enter(release(membrane.leave($$value1)) instanceof release(membrane.leave($$value2)));
    }
    throw new Error("Unknown binary operator: "+operator);
  };

  access.advice = advice;
  access.membrane = membrane;
  return access;

};
