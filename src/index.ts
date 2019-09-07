import { writable, derived } from "svelte/store";
import isEmpty from "lodash/isEmpty";
import cloneDeep from "lodash/cloneDeep";
import { ValidationError } from "yup";
import { update, assignDeep, reach, getValues } from "./utils";

const NO_ERROR = "";
const IS_TOUCHED = true;

const createForm = config => {
  const submit = config.submit;
  const validationSchema = config.validationSchema;
  const validate = config.validate;

  const initial = {
    values: () => cloneDeep(config.form),
    errors: () => assignDeep(config.form, NO_ERROR),
    touched: () => assignDeep(config.form, !IS_TOUCHED)
  };

  const form = writable(initial.values());
  const errors = writable(initial.errors());
  const touched = writable(initial.touched());

  let _form = {};
  const unsubscribe = form.subscribe(f => {
    _form = f;
  });

  const isSubmitting = writable<boolean>(false);
  const isValidating = writable<boolean>(false);

  const isValid = derived([errors, touched], ([$errors, $touched]): boolean => {
    const allTouched = getValues($touched).every(field => field === IS_TOUCHED);
    const noErrors = getValues($errors).every(field => field === NO_ERROR);
    return allTouched && noErrors;
  });

  function updateField(field: string, value: any): void {
    update(form, field, value);
  }

  function updateTouched(field: string, value: boolean): void {
    update(touched, field, value);
  }

  function handleChange(event: Event): void {
    const { name: field, value } = event.target as
      | HTMLInputElement
      | HTMLTextAreaElement;

    updateTouched(field, true);

    if (validationSchema) {
      isValidating.set(true);
      reach(validationSchema, field)
        .validate(value)
        .then(() => update(errors, field, ""))
        .catch(err => update(errors, field, err.message))
        .finally(() => {
          updateField(field, value);
          isValidating.set(false);
        });
      return;
    }

    updateField(field, value);
  }

  function handleSubmit(ev): void {
    if (ev && ev.preventDefault) {
      ev.preventDefault();
    }

    isSubmitting.set(true);

    // if there is a custom validate function
    // and use that instead of yup schema
    if (validate !== undefined && typeof validate === "function") {
      isValidating.set(true);

      const err = validate(_form);
      if (isEmpty(err)) {
        clearErrorsAndSubmit();
      } else {
        errors.set(err);
        isValidating.set(false);
      }
    }

    // if there is yup schema use to validate
    // and submit
    if (validationSchema) {
      isValidating.set(true);

      return validationSchema
        .validate(_form, { abortEarly: false })
        .then(() => {
          clearErrorsAndSubmit();
        })
        .catch((yupErrs: ValidationError) => {
          if (yupErrs && yupErrs.inner) {
            yupErrs.inner.forEach(error =>
              update(errors, error.path, error.message)
            );
          }
        })
        .finally(() => {
          isValidating.set(false);
          isSubmitting.set(false);
        });
    }

    // if no schema or validate fn is provided
    // just submit and unsubscribe
    clearErrorsAndSubmit();
  }

  function handleReset() {
    form.set(initial.values());
    errors.set(initial.errors());
    touched.set(initial.touched());
  }

  function clearErrorsAndSubmit() {
    return Promise.resolve()
      .then(() => errors.set(assignDeep(_form, "")))
      .then(() => submit({ values: _form, form, errors }))
      .finally(() => isSubmitting.set(false));
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
    updateTouched,
    unsubscribe,
    state: derived(
      [form, errors, touched, isValid, isSubmitting, isValidating],
      ([$form, $errors, $touched, $isValid, $isSubmitting, $isValidating]) => ({
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

export default createForm;
