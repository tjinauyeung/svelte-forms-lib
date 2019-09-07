import { derived, writable } from "svelte/store";
import { util } from "./util";

const NO_ERROR = "";
const IS_TOUCHED = true;

export const createForm = config => {
  const validationSchema = config.schema;
  const validateFn = config.validate;
  const submitFn = config.submit;

  const initial = {
    values: () => util.cloneDeep(config.form),
    errors: () => util.assignDeep(config.form, NO_ERROR),
    touched: () => util.assignDeep(config.form, !IS_TOUCHED)
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
    const allTouched = util
      .getValues($touched)
      .every(field => field === IS_TOUCHED);
    const noErrors = util.getValues($errors).every(field => field === NO_ERROR);
    return allTouched && noErrors;
  });

  function updateField(field: string, value: any): void {
    util.update(form, field, value);
  }

  function updateTouched(field: string, value: boolean): void {
    util.update(touched, field, value);
  }

  function handleChange(event: Event): void {
    const { name: field, value } = event.target as
      | HTMLInputElement
      | HTMLTextAreaElement;

    updateTouched(field, true);

    if (validationSchema) {
      isValidating.set(true);
      util
        .reach(validationSchema, field)
        .validate(value)
        .then(() => util.update(errors, field, ""))
        .catch(err => util.update(errors, field, err.message))
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

    if (typeof validateFn === "function") {
      isValidating.set(true);

      Promise.resolve()
        .then(() => validateFn(_form))
        .then(err => {
          if (util.isEmpty(err)) {
            clearErrorsAndSubmit();
          } else {
            errors.set(err);
            isValidating.set(false);
          }
        });
    }

    if (validationSchema) {
      isValidating.set(true);

      return validationSchema
        .validate(_form, { abortEarly: false })
        .then(() => clearErrorsAndSubmit())
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

    clearErrorsAndSubmit();
  }

  function handleReset() {
    form.set(initial.values());
    errors.set(initial.errors());
    touched.set(initial.touched());
  }

  function clearErrorsAndSubmit() {
    return Promise.resolve()
      .then(() => errors.set(util.assignDeep(_form, "")))
      .then(() => submitFn({ values: _form, form, errors }))
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
