import { derived, writable } from "svelte/store";
import { util } from "./util";

const NO_ERROR = "";
const IS_TOUCHED = true;

export const createForm = config => {
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
    touched: () => util.assignDeep(initialValues, !IS_TOUCHED)
  };

  const form = writable(getInitial.values());
  const errors = writable(getInitial.errors());
  const touched = writable(getInitial.touched());

  const isSubmitting = writable(false);
  const isValidating = writable(false);

  const isValid = derived([errors, touched], ([$errors, $touched]) => {
    const allTouched = util
      .getValues($touched)
      .every(field => field === IS_TOUCHED);
    const noErrors = util.getValues($errors).every(field => field === NO_ERROR);
    return allTouched && noErrors;
  });

  function isCheckbox(el) {
    return el.getAttribute && el.getAttribute('type') === 'checkbox';
  }

  function validateField(field) {
    return util.subscribeOnce(form).then((values) =>
      validateFieldValue(field, values[field])
    );
  }

  function validateFieldValue(field, value) {
    updateTouched(field, true);

    if (validationSchema) {
      isValidating.set(true);
      return util
        .reach(validationSchema, field)
        .validate(value)
        .then(() => util.update(errors, field, ""))
        .catch(err => util.update(errors, field, err.message))
        .finally(() => {
          isValidating.set(false);
        });
    }

    if (validateFn) {
      isValidating.set(true);
      return Promise.resolve()
        .then(() => validateFn({ [field]: value }))
        .then(errs => util.update(errors, field, errs[field]))
        .finally(() => {
          isValidating.set(false);
        })
    }
  }

  function updateValidateField(field, value) {
    return validateFieldValue(field, value).then(() => {
      updateField(field, value);
    });
  }


  function handleChange(event) {
    const el = event.target;
    const field = el.name;
    const value = isCheckbox(el) ? el.checked : el.value;

    return updateValidateField(field, value);
  }

  function handleSubmit(ev) {
    if (ev && ev.preventDefault) {
      ev.preventDefault();
    }

    isSubmitting.set(true);

    return util.subscribeOnce(form).then(values => {
      if (typeof validateFn === "function") {
        isValidating.set(true);

        return Promise.resolve()
          .then(() => validateFn(values))
          .then(err =>
            util.isEmpty(err) ? clearErrorsAndSubmit(values) : errors.set(err)
          )
          .finally(() => isValidating.set(false));
      }

      if (validationSchema) {
        isValidating.set(true);

        return validationSchema
          .validate(values, { abortEarly: false })
          .then(() => clearErrorsAndSubmit(values))
          .catch(yupErrs => {
            if (yupErrs && yupErrs.inner) {
              yupErrs.inner.forEach(error =>
                util.update(errors, error.path, error.message)
              );
            }
            isSubmitting.set(false);
          })
          .finally(() => isValidating.set(false));
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
      .then(() => errors.set(util.assignDeep(values, "")))
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
    if (Object.keys(initialValues).length < 1) {
      const provided = JSON.stringify(initialValues);

      console.warn(
        `createForm requires initialValues to be a non empty object or array, provided ${provided}`
      );

      return false;
    }

    return true;
  }

  /**
   * Update the initial values and reset form. Used to dynamically display new form values
   */
  function updateInitialValues(newValues, resetForm = true) {
    if (!isInitialValuesValid()) {
      return;
    }

    initialValues = newValues;

    if (resetForm) {
      handleReset();
    }
  }

  return {
    form,
    errors,
    touched,
    isValid,
    isSubmitting,
    isValidating,
    handleChange,
    handleSubmit,
    handleReset,
    updateField,
    updateValidateField,
    updateTouched,
    validateField,
    updateInitialValues,
    state: derived(
      [form, errors, touched, isValid, isValidating, isSubmitting],
      ([$form, $errors, $touched, $isValid, $isValidating, $isSubmitting]) => ({
        form: $form,
        errors: $errors,
        touched: $touched,
        isValid: $isValid,
        isSubmitting: $isSubmitting,
        isValidating: $isValidating
      })
    )
  };
};
