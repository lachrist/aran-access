
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

module.exports = (membrane, release, capture) => {

  const handlers = {};

  handlers.apply = (target, value, values) => {
    for (let index = 0, length = values.length; index < length; index++)
      values[index] = release(membrane.leave(values[index]));
    return membrane.enter(capture(Reflect_apply(target, release(value), values)));
  };

  handlers.construct = (target, values) => {
    for (let index = 0, length = values.length; index < length; index++)
      values[index] = release(membrane.leave(values[index]));
    return membrane.enter(capture(Reflect_construct(target, values)));
  };

  handlers.defineProperty = (target, key, descriptor) => {
    if (Array_isArray(target) && String(key) === "length")
      return Reflect_defineProperty(target, "length", descriptor);    
    if ("value" in descriptor) {
      descriptor.value = release(membrane.leave(descriptor.value));
    } else {
      if ("get" in descriptor)
        descriptor.get = release(descriptor.get);
      if ("set" in descriptor)
        descriptor.set = release(descriptor.set);
    }
    return Reflect_defineProperty(target, key, descriptor);
  };

  handlers.deleteProperty = Reflect.deleteProperty;

  // handlers.get

  handlers.getOwnPropertyDescriptor = (target, key) => {
    if (Array_isArray(target) && String(key) === "length")
      return Reflect_getOwnPropertyDescriptor(target, "length");
    const descriptor = Reflect_getOwnPropertyDescriptor(target, key);
    if (descriptor) {
      if ("value" in descriptor) {
        descriptor.value = membrane.enter(capture(descriptor.value));
      } else {
        descriptor.get = capture(descriptor.get);
        descriptor.set = capture(descriptor.set);
      }
    }
    return descriptor;
  };

  handlers.getPrototypeOf = (target) => capture(Reflect_getPrototypeOf(target));

  // handlers.has

  handlers.isExtensible = Reflect.isExtensible;

  handlers.ownKeys = Reflect.ownKeys;

  handlers.preventExtensions = Reflect.preventExtensions;

  // handlers.set

  handlers.setPrototypeOf = (target, prototype) => Reflect_setPrototypeOf(target, release(prototype));

  return handlers;

};
