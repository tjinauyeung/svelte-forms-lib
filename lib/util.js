import { forEach } from "property-expr";

function subscribeOnce(observable) {
  return new Promise(resolve => {
    observable.subscribe(resolve)(); // immediately invoke to unsubscribe
  });
}

function update(obj, path, val) {
  obj.update(o => {
    set(o, path, val);
    return o;
  });
}

function cloneDeep(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function isEmpty(obj) {
  return Object.keys(obj).length <= 0;
}

function getValues(obj) {
  let result = [];
  for (const key in obj) {
    result = result.concat(typeof obj[key] === "object" ? getValues(obj[key]) : obj[key]);
  }
  return result;
}

function assignDeep(obj, val) {
  if (Array.isArray(obj)) {
    return obj.map(o => assignDeep(o, val));
  }
  const copy = {};
  for (const key in obj) {
    copy[key] = typeof obj[key] === "object" ? assignDeep(obj[key], val) : val;
  }
  return copy;
}

function has(object, key) {
  return object != null && Object.prototype.hasOwnProperty.call(object, key);
}

function set(obj, path, value) {
  if (Object(obj) !== obj) return obj;
  if (!Array.isArray(path)) {
    path = path.toString().match(/[^.[\]]+/g) || [];
  }
  const res = path
    .slice(0, -1)
    .reduce(
      (acc, key, index) =>
        Object(acc[key]) === acc[key]
          ? acc[key]
          : (acc[key] = Math.abs(path[index + 1]) >> 0 === +path[index + 1] ? [] : {}),
      obj
    );
  res[path[path.length - 1]] = value;
  return obj;
}

// Implementation of yup.reach
// TODO rewrite to simpler version and remove dependency on forEach
function reach(obj, path, value, context) {
  return getIn(obj, path, value, context).schema;
}

function trim(part) {
  return part.substr(0, part.length - 1).substr(1);
}

function getIn(schema, path, value, context) {
  let parent, lastPart, lastPartDebug;

  context = context || value;

  if (!path)
    return {
      parent,
      parentPath: path,
      schema
    };

  forEach(path, (_part, isBracket, isArray) => {
    let part = isBracket ? trim(_part) : _part;

    if (isArray || has(schema, "_subType")) {
      let index = isArray ? parseInt(part, 10) : 0;
      schema = schema.resolve({ context, parent, value })._subType;
      if (value) {
        value = value[index];
      }
    }

    if (!isArray) {
      schema = schema.resolve({ context, parent, value });
      schema = schema.fields[part];
      parent = value;
      value = value && value[part];
      lastPart = part;
      lastPartDebug = isBracket ? "[" + _part + "]" : "." + _part;
    }
  });

  return { schema, parent, parentPath: lastPart };
}

export const util = {
  subscribeOnce,
  update,
  cloneDeep,
  isEmpty,
  assignDeep,
  reach,
  getValues
};
