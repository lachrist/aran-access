
const Array_isArray = Array.isArray;
const Object_assign = Object.assign;

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

module.exports = (membrane, capture, release) => {

  const handlers = {};

  handlers.apply = (target, value, values) => {
    for (let index = 0, length = values.length; index < length; index++)
      values[index] = membrane.enter(capture(values[index]));
    return release(membrane.leave(Reflect_apply(target, capture(value), values)));
  };

  handlers.construct = (target, values) => {
    for (let index = 0, length = values.length; index < length; index++)
      values[index] = membrane.enter(capture(values[index]));
    return release(membrane.leave(Reflect_construct(target, values)));
  };

  handlers.defineProperty = (target, key, descriptor) => {
    if (Array_isArray(target) && String(key) === "length")
      return Reflect_defineProperty(target, "length", descriptor);    
    if ("value" in descriptor) {
      descriptor.value = membrane.enter(capture(descriptor.value));
    } else {
      if ("get" in descriptor)
        descriptor.get = capture(descriptor.get);
      if ("set" in descriptor)
        descriptor.set = capture(descriptor.set);
    }
    return Reflect_defineProperty(target, key, descriptor);
  };

  handlers.deleteProperty = Reflect.deleteProperty;

  // handlers.get = (target, key, receiver) => {
  //   if (Array_isArray(target) && String(key) === "length")
  //     return target.length;
  //   const descriptor = Reflect_getOwnPropertyDescriptor(target, key);
  //   if (descriptor) {
  //     if ("value" in descriptor)
  //       return release(membrane.leave(descriptor.value));
  //     if ("get" in descriptor)
  //       return Reflect_apply(release(descriptor.get), receiver, []);
  //     return void 0;
  //   }
  //   const prototype = Reflect_getPrototypeOf(target);
  //   if (prototype)
  //     return Reflect_get(release(prototype), key, receiver);
  //   if (key === "__proto__")
  //     return Reflect_getPrototypeOf(receiver);
  //   return void 0;
  // };

  handlers.getOwnPropertyDescriptor = (target, key) => {
    if (Array_isArray(target) && String(key) === "length")
      return Reflect_getOwnPropertyDescriptor(target, "length");
    const descriptor = Reflect_getOwnPropertyDescriptor(target, key);
    if (descriptor) {
      if ("value" in descriptor) {
        descriptor.value = release(membrane.leave(descriptor.value));
      } else {
        descriptor.get = release(descriptor.get);
        descriptor.set = release(descriptor.set);
      }
    }
    return descriptor;
  };

  handlers.getPrototypeOf = (target) => release(Reflect_getPrototypeOf(target));

  // handlers.has = Reflect.has;

  handlers.isExtensible = Reflect.isExtensible;

  handlers.ownKeys = Reflect.ownKeys;

  handlers.preventExtensions = Reflect.preventExtensions;

  // handlers.set = (target, key, value, receiver) => {
  //   if (Array_isArray(target) && String(key) === "length")
  //     return target.length = value;
  //   const descriptor = Reflect_getOwnPropertyDescriptor(target, key);
  //   if (descriptor) {
  //     if (descriptor.writable)
  //       return Reflect_defineProperty(receiver, key, Object_assign({
  //         writable: true,
  //         enumerable: true,
  //         configurable: true
  //       }, Reflect_getOwnPropertyDescriptor(receiver), {value:value}));
  //     if (descriptor.set) {
  //       Reflect_apply(release(descriptor.set), receiver, [value]);
  //       return true;
  //     }
  //     return false;
  //   }
  //   const prototype = Reflect_getPrototypeOf(target);
  //   if (prototype)
  //     return Reflect_set(release(prototype), key, value, receiver);
  //   if (key === "__proto__")
  //     return Reflect_setPrototypeOf(receiver, value);
  //   return Reflect_defineProperty(receiver, key, Object_assign({
  //     writable: true,
  //     enumerable: true,
  //     configurable: true
  //   }, Reflect_getOwnPropertyDescriptor(receiver), {value:value}));
  // };

  handlers.setPrototypeOf = (target, prototype) => Reflect_setPrototypeOf(target, capture(prototype));

  return handlers;

};
