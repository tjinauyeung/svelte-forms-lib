import set from "lodash/set";
import isArray from "lodash/isArray";
import isObject from "lodash/isObject";

export function update(obj, path, val) {
  obj.update(o => {
    set(o, path, val);
    return o;
  });
}

export function assignDeep(obj, val) {
  if (isArray(obj)) {
    return obj.map(o => assignDeep(o, val));
  }

  const copy = {};
  for (const key in obj) {
    copy[key] = isObject(obj[key]) ? assignDeep(obj[key], val) : val;
  }

  return copy;
}
