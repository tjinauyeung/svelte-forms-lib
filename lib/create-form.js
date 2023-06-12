import {derived, writable, get} from 'svelte/store';
import {util} from './util';
import {ValidationError} from 'yup';

const NO_ERROR = '';
const IS_TOUCHED = true;

function isCheckbox(element) {
  return element.getAttribute && element.getAttribute('type') === 'checkbox';
}

function isFileInput(element) {
  return element.getAttribute && element.getAttribute('type') === 'file';
}

function resolveValue(element) {
  if (isFileInput(element)) {
    return element.files;
  } else if (isCheckbox(element)) {
    return element.checked;
  } else {
    return element.value;
  }
}

export const createForm = (config) => {
  let initialValues = config.initialValues || {};

  const validationSchema = config.validationSchema;
  const validateFunction = config.validate;
  const onSubmit = config.onSubmit;

  const getInitial = {
    values: () => util.cloneDeep(initialValues),
    errors: () =>
      validationSchema
        ? util.getErrorsFromSchema(initialValues, validationSchema.fields)
        : util.assignDeep(initialValues, NO_ERROR),
    touched: () => util.assignDeep(initialValues, !IS_TOUCHED),
  };

  const form = writable(getInitial.values());
  const errors = writable(getInitial.errors());
  const touched = writable(getInitial.touched());

  const isSubmitting = writable(false);
  const isValidating = writable(false);

  const isValid = derived(errors, ($errors) => {
    const noErrors = util
      .getValues($errors)
      .every((field) => field === NO_ERROR);
    return noErrors;
  });

  const modified = derived(form, ($form) => {
    const object = util.assignDeep($form, false);

    for (let key in $form) {
      object[key] = !util.deepEqual($form[key], initialValues[key]);
    }

    return object;
  });

  const isModified = derived(modified, ($modified) => {
    return util.getValues($modified).includes(true);
  });

  function validateField(field) {
    return util
      .subscribeOnce(form)
      .then((values) => validateFieldValue(field, values[field]));
  }

  function validateFieldValue(field, value) {
    updateTouched(field, true);

    if (validationSchema) {
      isValidating.set(true);

      return validationSchema
        .validateAt(field, get(form))
        .then(() => util.update(errors, field, ''))
        .catch((error) => util.update(errors, field, error.message))
        .finally(() => {
          isValidating.set(false);
        });
    }

    if (validateFunction) {
      isValidating.set(true);
      return Promise.resolve()
        .then(() => validateFunction({[field]: value}))
        .then((errs) =>
          util.update(errors, field, !util.isNullish(errs) ? errs[field] : ''),
        )
        .finally(() => {
          isValidating.set(false);
        });
    }

    return Promise.resolve();
  }

  function updateValidateField(field, value) {
    updateField(field, value);
    return validateFieldValue(field, value);
  }

  function handleChange(event) {
    const element = event.target;
    const field = element.name || element.id;
    const value = resolveValue(element);

    return updateValidateField(field, value);
  }

  function validateValues(values) {
    if (typeof validateFunction === 'function') {
      isValidating.set(true);

      return Promise.resolve()
        .then(() => validateFunction(values))
        .then((error) => {
          errors.set(error);

          return error;
        })
        .finally(() => isValidating.set(false));
    } else if (validationSchema) {
      isValidating.set(true);

      return (
        validationSchema
          .validate(values, {abortEarly: false})
          .then(() => {
            return {};
          }) // NOTE:[KT] return empty errors object if validation does not raise an error
          // eslint-disable-next-line unicorn/catch-error-name
          .catch((error) => {
            if (ValidationError.isError(error) && error.inner) {
              const updatedErrors = getInitial.errors();

              error.inner.map((error) =>
                util.set(updatedErrors, error.path, error.message),
              );

              errors.set(updatedErrors);

              return updatedErrors;
            } else {
              throw error;
            }
          })
          .finally(() => isValidating.set(false))
      );
    } else {
      // NOTE: [KT] no validation defined so return a promise to conform to the return type
      return Promise.resolve();
    }
  }

  function validateForm() {
    return util.subscribeOnce(form).then((values) => {
      return validateValues(values);
    });
  }

  function handleSubmit(event) {
    if (event && event.preventDefault) {
      event.preventDefault();
    }

    isSubmitting.set(true);

    return util.subscribeOnce(form).then((values) => {
      return validateValues(values)
        .then((error) => {
          if (util.isNullish(error) || util.getValues(error).length === 0) {
            return clearErrorsAndSubmit(values);
          }
        })
        .finally(() => {
          isSubmitting.set(false);
        });
    });
  }

  function handleReset() {
    form.set(getInitial.values());
    errors.set(getInitial.errors());
    touched.set(getInitial.touched());
  }

  function clearErrorsAndSubmit(values) {
    return Promise.resolve()
      .then(() => errors.set(getInitial.errors()))
      .then(() => onSubmit(values, form, errors))
      .finally(() => isSubmitting.set(false));
  }

  /**
   * Handler to imperatively update the value of a form field
   */
  function updateField(field, value) {
    util.update(form, field, value);
  }

  /**
   * Handler to imperatively update the touched value of a form field
   */
  function updateTouched(field, value) {
    util.update(touched, field, value);
  }

  /**
   * Update the initial values and reset form. Used to dynamically display new form values
   */
  function updateInitialValues(newValues) {
    initialValues = newValues;

    handleReset();
  }

  return {
    form,
    errors,
    touched,
    modified,
    isValid,
    isSubmitting,
    isValidating,
    isModified,
    handleChange,
    handleSubmit,
    handleReset,
    updateField,
    updateValidateField,
    updateTouched,
    validateField,
    validateForm,
    updateInitialValues,
    state: derived(
      [
        form,
        errors,
        touched,
        modified,
        isValid,
        isValidating,
        isSubmitting,
        isModified,
      ],
      ([
        $form,
        $errors,
        $touched,
        $modified,
        $isValid,
        $isValidating,
        $isSubmitting,
        $isModified,
      ]) => ({
        form: $form,
        errors: $errors,
        touched: $touched,
        modified: $modified,
        isValid: $isValid,
        isSubmitting: $isSubmitting,
        isValidating: $isValidating,
        isModified: $isModified,
      }),
    ),
  };
};
