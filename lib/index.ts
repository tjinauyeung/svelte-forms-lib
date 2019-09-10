import { derived, writable } from "svelte/store";
import { util } from "./util";
import { FormConfig, FormInstance, FormValidationErrors, FormTouched } from "./types";

const NO_ERROR = "";
const IS_TOUCHED = true;

const createForm = (config: FormConfig): FormInstance | void => {
  const initialValues = config.initialValues || {};

  if (Object.keys(initialValues).length < 1) {
    const provided = JSON.stringify(initialValues);
    console.warn(
      `createForm requires initialValues to be a non empty object or array, provided ${provided}`
    );
    return;
  }

  const validationSchema = config.validationSchema;
  const validateFn = config.validate;
  const onSubmit = config.onSubmit;

  const initial = {
    values: () => util.cloneDeep(initialValues),
    errors: (): FormValidationErrors => util.assignDeep(initialValues, NO_ERROR),
    touched: (): FormTouched => util.assignDeep(initialValues, !IS_TOUCHED)
  };

  const form = writable(initial.values());
  const errors = writable(initial.errors());
  const touched = writable(initial.touched());

  const isSubmitting = writable<boolean>(false);
  const isValidating = writable<boolean>(false);

  const isValid = derived([errors, touched], ([$errors, $touched]): boolean => {
    const allTouched = util.getValues($touched).every(field => field === IS_TOUCHED);
    const noErrors = util.getValues($errors).every(field => field === NO_ERROR);
    return allTouched && noErrors;
  });

  function handleChange(event: Event): void {
    const { name: field, value } = event.target as HTMLInputElement | HTMLTextAreaElement;

    updateTouched(field, true);

    if (validationSchema) {
      isValidating.set(true);
      return util
        .reach(validationSchema, field)
        .validate(value)
        .then(() => util.update(errors, field, ""))
        .catch(err => util.update(errors, field, err.message))
        .finally(() => {
          updateField(field, value);
          isValidating.set(false);
        });
    }

    updateField(field, value);
  }

  function handleSubmit(ev: Event) {
    if (ev && ev.preventDefault) {
      ev.preventDefault();
    }

    isSubmitting.set(true);

    return util.subscribeOnce(form).then(values => {
      if (typeof validateFn === "function") {
        isValidating.set(true);

        return Promise.resolve()
          .then(() => validateFn(values))
          .then(err => {
            if (util.isEmpty(err)) {
              clearErrorsAndSubmit(values);
            } else {
              errors.set(err);
              isValidating.set(false);
            }
          });
      }

      if (validationSchema) {
        isValidating.set(true);

        return validationSchema
          .validate(values, { abortEarly: false })
          .then(() => clearErrorsAndSubmit(values))
          .catch(yupErrs => {
            if (yupErrs && yupErrs.inner) {
              yupErrs.inner.forEach(error => util.update(errors, error.path, error.message));
            }
            isSubmitting.set(false);
          })
          .finally(() => isValidating.set(false));
      }

      clearErrorsAndSubmit(values);
    });
  }

  function handleReset(): void {
    form.set(initial.values());
    errors.set(initial.errors());
    touched.set(initial.touched());
  }

  function clearErrorsAndSubmit(values): Promise<any> {
    return Promise.resolve()
      .then(() => errors.set(util.assignDeep(values, "")))
      .then(() => onSubmit(values, form, errors))
      .finally(() => isSubmitting.set(false));
  }

  /**
   * Handler to imperatively update the value of a form field
   */
  function updateField(field: string, value: any): void {
    util.update(form, field, value);
  }

  /**
   * Handler to imperatively update the touched value of a form field
   */
  function updateTouched(field: string, value: boolean): void {
    util.update(touched, field, value);
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

export default createForm;
