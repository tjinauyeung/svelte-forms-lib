import _ from "lodash";

export function update(obj, path, val) {
  obj.update(o => {
    _.set(o, path, val);
    return o;
  });
}

export function assignDeep(obj, val) {
  if (_.isArray(obj)) {
    return obj.map(o => assignDeep(o, val));
  }

  // _.keys(obj)
  const copy = {};
  for (const key in obj) {
    copy[key] = _.isObject(obj[key]) ? assignDeep(obj[key], val) : val;
  }

  return copy;
}
