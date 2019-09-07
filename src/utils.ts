import has from "lodash/has";
import set from "lodash/set";
import isArray from "lodash/isArray";
import isObject from "lodash/isObject";
import { forEach } from "property-expr";

export function update(obj, path, val) {
  obj.update(o => {
    set(o, path, val);
    return o;
  });
}

export function getValues(obj: object): string[] | number[] {
  let result = [];
  for (const key in obj) {
    result = result.concat(isObject(obj[key]) ? getValues(obj[key]) : obj[key]);
  }
  return result;
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

export function reach(obj, path, value?, context?) {
  return getIn(obj, path, value, context).schema;
}

function trim(part) {
  return part.substr(0, part.length - 1).substr(1);
}

function getIn(schema, path, value, context) {
  let parent, lastPart, lastPartDebug;

  // if only one "value" arg then use it for both
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
      // we skipped an array: foo[].bar
      let idx = isArray ? parseInt(part, 10) : 0;

      schema = schema.resolve({ context, parent, value })._subType;

      if (value) {
        if (isArray && idx >= value.length) {
          throw new Error(
            `Yup.reach cannot resolve an array item at index: ${_part}, in the path: ${path}. ` +
              `because there is no value at that index. `
          );
        }

        value = value[idx];
      }
    }

    if (!isArray) {
      schema = schema.resolve({ context, parent, value });

      if (!has(schema, "fields") || !has(schema.fields, part))
        throw new Error(
          `The schema does not contain the path: ${path}. ` +
            `(failed at: ${lastPartDebug} which is a type: "${schema._type}") `
        );

      schema = schema.fields[part];

      parent = value;
      value = value && value[part];
      lastPart = part;
      lastPartDebug = isBracket ? "[" + _part + "]" : "." + _part;
    }
  });

  return { schema, parent, parentPath: lastPart };
}
