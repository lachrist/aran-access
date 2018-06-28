
const VirtualProxy = require("virtual-proxy");
const WeakMap_prototype_get = WeakMap.prototype.get;
const WeakMap_prototype_set = WeakMap.prototype.set;

module.exports = () => {
  const foreign_internal_objects = new WeakMap();
  foreign_internal_objects.get = WeakMap_prototype_get;
  foreign_internal_objects.set = WeakMap_prototype_set;
  const native_internal_objects = new WeakMap();
  native_internal_objects.get = WeakMap_prototype_get;
  native_internal_objects.set = WeakMap_prototype_set;
  let native_external_objects = null;
  let proxy_handlers = null;
  return {
    internal_value_of: (external_value) => {
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
    },
    native_internal_objects: native_internal_objects,
    resolve_native_external_objects: (map) => native_external_objects = map, 
    resolve_proxy_handlers: (handlers) => proxy_handlers = handlers
  };
};
