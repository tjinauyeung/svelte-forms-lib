import {derived, writable} from 'svelte/store';
import {util} from './util';

const NO_ERROR = '';
const IS_TOUCHED = true;

function isCheckbox(element) {
  return element.getAttribute && element.getAttribute('type') === 'checkbox';
}

export const createForm = (config) => {
  let initialValues = config.initialValues || {};

  if (!isInitialValuesValid()) {
    return;
  }

  const validationSchema = config.validationSchema;
  const validateFn = config.validate;
  const onSubmit = config.onSubmit;

  const getInitial = {
    values: () => util.cloneDeep(initialValues),
    errors: () => util.assignDeep(initialValues, NO_ERROR),
    touched: () => util.assignDeep(initialValues, !IS_TOUCHED),
  };

  const form = writable(getInitial.values());
  const errors = writable(getInitial.errors());
  const touched = writable(getInitial.touched());

  const isSubmitting = writable(false);
  const isValidating = writable(false);

  const isValid = derived([errors, touched], ([$errors, $touched]) => {
    const allTouched = util
      .getValues($touched)
      .every((field) => field === IS_TOUCHED);
    const noErrors = util
      .getValues($errors)
      .every((field) => field === NO_ERROR);
    return allTouched && noErrors;
  });

  const modified = derived(form, ($form) => {
    const object = util.assignDeep($form, false);

    for (let key in $form) {
      if ($form[key] !== initialValues[key]) {
        object[key] = true;
      }
    }

    return object;
  });

  const isModified = derived(modified, ($modified) => {
    return util.getValues($modified).some((field) => field === true);
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
      return util
        .reach(validationSchema, field)
        .validate(value)
        .then(() => util.update(errors, field, ''))
        .catch((error) => util.update(errors, field, error.message))
        .finally(() => {
          isValidating.set(false);
        });
    }

    if (validateFn) {
      isValidating.set(true);
      return Promise.resolve()
        .then(() => validateFn({[field]: value}))
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
    return validateFieldValue(field, value).then(() => {
      updateField(field, value);
    });
  }

  function handleChange(event) {
    const element = event.target;
    const field = element.name || element.id;
    const value = isCheckbox(element) ? element.checked : element.value;

    return updateValidateField(field, value);
  }

  function handleSubmit(ev) {
    if (ev && ev.preventDefault) {
      ev.preventDefault();
    }

    isSubmitting.set(true);

    return util.subscribeOnce(form).then((values) => {
      if (typeof validateFn === 'function') {
        isValidating.set(true);

        return Promise.resolve()
          .then(() => validateFn(values))
          .then((error) =>
            util.isEmpty(error)
              ? clearErrorsAndSubmit(values)
              : errors.set(error),
          )
          .finally(() => isValidating.set(false));
      }

      if (validationSchema) {
        isValidating.set(true);

        return (
          validationSchema
            .validate(values, {abortEarly: false})
            .then(() => clearErrorsAndSubmit(values))
            // eslint-disable-next-line unicorn/catch-error-name
            .catch((yupErrors) => {
              if (yupErrors && yupErrors.inner) {
                yupErrors.inner.forEach((error) =>
                  util.update(errors, error.path, error.message),
                );
              }
              isSubmitting.set(false);
            })
            .finally(() => isValidating.set(false))
        );
      }

      clearErrorsAndSubmit(values);
    });
  }

  function handleReset() {
    form.set(getInitial.values());
    errors.set(getInitial.errors());
    touched.set(getInitial.touched());
  }

  function clearErrorsAndSubmit(values) {
    return Promise.resolve()
      .then(() => errors.set(util.assignDeep(values, '')))
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

  function isInitialValuesValid() {
    if (Object.keys(initialValues).length === 0) {
      const provided = JSON.stringify(initialValues);

      // eslint-disable-next-line no-undef
      console.warn(
        `createForm requires initialValues to be a non empty object or array, provided ${provided}`,
      );

      return false;
    }

    return true;
  }

  /**
   * Update the initial values and reset form. Used to dynamically display new form values
   */
  function updateInitialValues(newValues) {
    if (!isInitialValuesValid()) {
      return;
    }

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
