<script>
  import {getContext} from 'svelte';
  import {key} from './key';

  export let name;
  export let type = 'text';
  export let error;

  const {form, handleChange, errors} = getContext(key);

  $: {
    error = $errors[name];
  }
</script>

<input
  {name}
  {type}
  value={$form[name]}
  on:change={handleChange}
  on:blur={handleChange}
  {...$$props}
/>
