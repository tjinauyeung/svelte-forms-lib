import { derived, writable } from "svelte/store";
import { util } from "./util";

const NO_ERROR = "";
const IS_TOUCHED = true;

export const createForm = config => {
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
        errors: () => util.assignDeep(initialValues, NO_ERROR),
        touched: () => util.assignDeep(initialValues, !IS_TOUCHED)
    };

    const form = writable(initial.values());
    const errors = writable(initial.errors());
    const touched = writable(initial.touched());

    const isSubmitting = writable(false);
    const isValidating = writable(false);

    const isValid = derived([errors, touched], ([$errors, $touched]) => {
        /*
        const allTouched = util
          .getValues($touched)
          .every(field => field === IS_TOUCHED);
        */
        const noErrors = util.getValues($errors).every(field => field === NO_ERROR);
        return /* allTouched && */ noErrors;
    });

    function isCheckbox(el) {
        return el.getAttribute && el.getAttribute('type') === 'checkbox';
    }

    function handleChange(event) {
        const el = event.target;
        const field = el.name;
        const value = isCheckbox(el) ? el.checked : el.value;

        updateTouched(field, true);

        if (validationSchema) {
            isValidating.set(true);
            return validationSchema
                .validateAt(field, context)
                .then(() => util.update(errors, field, ""))
                .catch(err => util.update(errors, field, err.message))
                .finally(() => {
                    updateField(field, value);
                    isValidating.set(false);
                });
        }

        if (validateFn) {
            isValidating.set(true);
            return Promise.resolve()
                .then(() => validateFn({
                    [field]: value
                }))
                .then(errs => util.update(errors, field, errs[field]))
                .finally(() => {
                    updateField(field, value);
                    isValidating.set(false);
                })
        }

        updateField(field, value);
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
        form.set(initial.values());
        errors.set(initial.errors());
        touched.set(initial.touched());
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