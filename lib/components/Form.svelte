<script>
  import {setContext} from 'svelte';
  import {createForm} from '../create-form';
  import {key} from './key';

  export let createdForm = createForm({
    initialValues,
    validationSchema,
    validate,
    onSubmit,
  });

  export let initialValues = {};
  export let validate = null;
  export let validationSchema = null;
  export let onSubmit;

  const {
    form,
    errors,
    touched,
    state,
    handleChange,
    handleSubmit,
    updateField,
    updateTouched,
  } = createdForm;

  setContext(key, {
    form,
    errors,
    touched,
    state,
    handleChange,
    handleSubmit,
    updateField,
    updateTouched,
  });
</script>

<form on:submit={handleSubmit} {...$$restProps}>
  <slot
    {form}
    {errors}
    {touched}
    {state}
    {handleChange}
    {handleSubmit}
    {updateField}
    {updateTouched}
  />
</form>
