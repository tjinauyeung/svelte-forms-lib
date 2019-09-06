import yup from "yup";
import _ from "lodash";
import { update, assignDeep } from "./utils";
import { writable, derived } from "svelte/store";

const DEFAULT_ERROR_VALUE = "";
const DEFAULT_TOUCHED_VALUE = false;

const createForm = config => {
  const schema = config.schema;
  const submit = config.submit;
  const validate = config.validate;

  const initial = {
    values: () => _.cloneDeep(config.form),
    errors: () => assignDeep(config.form, DEFAULT_ERROR_VALUE),
    touched: () => assignDeep(config.form, DEFAULT_TOUCHED_VALUE)
  };

  const form = writable(initial.values());
  const errors = writable(initial.errors());
  const touched = writable(initial.touched());

  const isSubmitting = writable(false);
  const isValidating = writable(false);

  const isValid = derived([errors, touched], ([$errors, $touched]) => {
    // const noErrors = Object.values($errors).every(v => v === ""); // use better way to check for errors
    // const allIsTouched = Object.values($touched).every(v => v === true); // use better way to check for touched
    // return noErrors && allIsTouched;
    return false;
  });

  function handleChange(ev) {
    const field = ev.target.name;
    const value = ev.target.value;

    console.log("changed");

    update(touched, field, true);

    if (schema) {
      isValidating.set(true);
      return yup
        .reach(schema, field)
        .validate(value)
        .then(() => update(errors, field, ""))
        .catch(err => update(errors, field, err.message))
        .finally(() => {
          update(form, field, value);
          isValidating.set(false);
        });
    }

    update(form, field, value);
  }

  function handleSubmit(ev) {
    ev.preventDefault();

    console.log("submitted");

    isSubmitting.update(n => {
      n = true;
      return n;
    });

    const unsubscribe = form.subscribe(values => {
      // if there is a custom validate function
      // and use that instead of yup schema
      if (validate !== undefined && typeof validate === "function") {
        isValidating.set(true);

        const err = validate(values);
        if (_.isEmpty(err)) {
          resetErrorsAndSubmit(values);
        } else {
          errors.update(e => ({
            ...e,
            ...err
          }));
        }

        return setTimeout(() => {
          unsubscribe();
          isValidating.set(false);
        });
      }

      // if there is yup schema use to validate
      // and submit
      if (schema) {
        return schema
          .validate(values, { abortEarly: false })
          .then(() => resetErrorsAndSubmit(values))
          .catch(yupErrors => {
            yupErrors.inner.forEach(error =>
              update(errors, error.path, error.message)
            );
          })
          .finally(() => {
            return setTimeout(() => unsubscribe());
          });
      }

      // if no schema or validate fn is provided
      // just submit and unsubscribe
      return resetErrorsAndSubmit(values).then(() => unsubscribe());
    });
  }

  function handleReset() {
    form.set(initial.values());
    errors.set(initial.errors());
    touched.set(initial.touched());
  }

  function resetErrorsAndSubmit(values) {
    return Promise.resolve()
      .then(() => errors.set(initial.errors()))
      .then(() => submit({ values, form, errors }));
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
