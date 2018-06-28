
const VirtualProxy = require("virtual-proxy");
const WeakMap_prototype_has = WeakMap.prototype.has;
const WeakMap_prototype_get = WeakMap.prototype.get;
const WeakMap_prototype_set = WeakMap.prototype.set;

module.exports = (check) => {
  const internal_objects = check ? new WeakMap() : null;
  if (check) {
    internal_objects.get = WeakMap_prototype_get;
    internal_objects.set = WeakMap_prototype_set;
    internal_objects.has = WeakMap_prototype_has;
  }
  const foreign_internal_objects = new WeakMap();
  foreign_internal_objects.get = WeakMap_prototype_get;
  foreign_internal_objects.set = WeakMap_prototype_set;
  const native_internal_objects = new WeakMap();
  native_internal_objects.get = WeakMap_prototype_get;
  native_internal_objects.set = WeakMap_prototype_set;
  let native_external_objects = null;
  let proxy_handlers = null;
  let external_objects = null;
  const internalize = (external_value) => {
    if (external_value && typeof external_value === "object" || typeof external_value === "function") {
      const native_internal_object = native_internal_objects.get(external_value);
      if (native_internal_object)
        return native_internal_object;
      let foreign_internal_object = foreign_internal_objects.get(external_value);
      if (!foreign_internal_object) {
        foreign_internal_object = VirtualProxy(external_value, proxy_handlers);
        native_external_objects.set(foreign_internal_object, external_value);
        foreign_internal_objects.set(external_value, foreign_internal_object);
      }
      return foreign_internal_object;
    }
    return external_value;
  };
  return {
    internalize: check ? (external_value) => {
      const internal_value = internalize(external_value);
      if (external_value !== internal_value) {
        if (internal_objects.has(external_value))
          throw new Error("Argument incompatibility from here: "+internal_objects.get(external_value));
        if (external_objects.has(internal_value))
          throw new Error("Result incompatibility from here: "+external_objects.get(internal_value));
        if (!internal_objects.has(internal_value))
          internal_objects.set(internal_value, "Argument\n    "+(new Error()).stack.split("\n").slice(1).join("\n    "));
        if (!external_objects.has(external_value))
          external_objects.set(external_value, "Result\n    "+(new Error()).stack.split("\n").slice(1).join("\n    "));
      }
      return internal_value;
    } : internalize,
    resolve_proxy_handlers: (handlers) => proxy_handlers = handlers,
    native_internal_objects,
    resolve_native_external_objects: (map) => native_external_objects = map,
    internal_objects,
    resolve_external_objects: (map) => external_objects = map
  };
};
