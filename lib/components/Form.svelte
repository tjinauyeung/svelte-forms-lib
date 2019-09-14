<script>
  import { setContext } from "svelte";
  import { createForm } from "../createForm";
  import { key } from "./key";

  export let initialValues;
  export let validate;
  export let validationSchema;
  export let onSubmit;

  const {
    form,
    errors,
    touched,
    state,
    handleChange,
    handleSubmit,
    updateField,
    updateTouched
  } = createForm({
    initialValues,
    validationSchema,
    validate,
    onSubmit
  });

  setContext(key, {
    form,
    errors,
    touched,
    state,
    handleChange,
    handleSubmit,
    updateField,
    updateTouched
  });
</script>

<form on:submit={handleSubmit} {...$$props}>
  <slot
    {form}
    {errors}
    {touched}
    {state}
    {handleChange}
    {handleSubmit}
    {updateField}
    {updateTouched} />
</form>
