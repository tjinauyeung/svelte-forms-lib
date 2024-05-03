<script>
  import {setContext} from 'svelte';
  import {createForm} from '../create-form';
  import {key} from './key';

  let {
    initialValues = {},
    validate = null,
    validationSchema = null,
    onSubmit = () => {
      throw new Error(
        'onSubmit is a required property in <Form /> when using the fallback context',
      );
    },
    context = createForm({
      initialValues,
      onSubmit,
      validate,
      validationSchema,
    }),
    children,
    ...restProps
  } = $props();

  const {
    form,
    errors,
    touched,
    state,
    handleChange,
    handleSubmit,
    updateField,
    updateInitialValues,
    updateTouched,
    updateValidateField,
    validateField,
  } = context;

  setContext(key, {
    form,
    errors,
    touched,
    state,
    handleChange,
    handleSubmit,
    updateField,
    updateInitialValues,
    updateTouched,
    updateValidateField,
    validateField,
  });
</script>

<form onsubmit={handleSubmit} {...restProps}>
  {@render children(
    form,
    errors,
    touched,
    state,
    handleChange,
    handleSubmit,
    updateField,
    updateInitialValues,
    updateTouched,
    updateValidateField,
    validateField,
  )}
</form>
