import {forEach} from 'property-expr';

function subscribeOnce(observable) {
  return new Promise((resolve) => {
    observable.subscribe(resolve)(); // immediately invoke to unsubscribe
  });
}

function update(object, path, value) {
  object.update((o) => {
    set(o, path, value);
    return o;
  });
}

function cloneDeep(object) {
  return JSON.parse(JSON.stringify(object));
}

function isNullish(value) {
  return value === undefined || value === null;
}

function isEmpty(object) {
  return isNullish(object) || Object.keys(object).length <= 0;
}

function getValues(object) {
  let result = [];
  for (const [, value] of Object.entries(object)) {
    result = result.concat(
      typeof value === 'object' ? getValues(value) : value,
    );
  }
  return result;
}

function assignDeep(object, value) {
  if (Array.isArray(object)) {
    return object.map((o) => assignDeep(o, value));
  }
  const copy = {};
  for (const key in object) {
    copy[key] =
      typeof object[key] === 'object' ? assignDeep(object[key], value) : value;
  }
  return copy;
}

function has(object, key) {
  return (
    object != undefined && Object.prototype.hasOwnProperty.call(object, key)
  );
}

function set(object, path, value) {
  if (new Object(object) !== object) return object;

  if (!Array.isArray(path)) {
    path = path.toString().match(/[^.[\]]+/g) || [];
  }

  const result = path
    .slice(0, -1)
    .reduce(
      (accumulator, key, index) =>
        new Object(accumulator[key]) === accumulator[key]
          ? accumulator[key]
          : (accumulator[key] =
              Math.abs(path[index + 1]) >> 0 === +path[index + 1] ? [] : {}),
      object,
    );

  result[path[path.length - 1]] = value;

  return object;
}

// Implementation of yup.reach
// TODO rewrite to simpler version and remove dependency on forEach
function reach(object, path, value, context) {
  return getIn(object, path, value, context).schema;
}

function trim(part) {
  return part.slice(0, -1).slice(1);
}

function getIn(schema, path, value, context) {
  let parent, lastPart, lastPartDebug;

  context = context || value;

  if (!path)
    return {
      parent,
      parentPath: path,
      schema,
    };

  forEach(path, (_part, isBracket, isArray) => {
    let part = isBracket ? trim(_part) : _part;

    if (isArray || has(schema, '_subType')) {
      let index = isArray ? Number.parseInt(part, 10) : 0;
      schema = schema.resolve({context, parent, value})._subType;
      if (value) {
        value = value[index];
      }
    }

    if (!isArray) {
      schema = schema.resolve({context, parent, value});
      schema = schema.fields[part];
      parent = value;
      value = value && value[part];
      lastPart = part;
      // eslint-disable-next-line no-unused-vars
      lastPartDebug = isBracket ? '[' + _part + ']' : '.' + _part;
    }
  });

  return {schema, parent, parentPath: lastPart};
}

export const util = {
  assignDeep,
  cloneDeep,
  getValues,
  isEmpty,
  reach,
  subscribeOnce,
  update,
  isNullish,
};
