<script>
  import {setContext} from 'svelte';
  import {createForm} from '../create-form';
  import {key} from './key';

  export let initialValues = {};
  export let validate = null;
  export let validationSchema = null;
  export let onSubmit;

  export let context = createForm({
    initialValues,
    validationSchema,
    validate,
    onSubmit,
  });

  setContext(key, context);
</script>

<form on:submit={context.handleSubmit} {...$$restProps}>
  <slot {...context} />
</form>
