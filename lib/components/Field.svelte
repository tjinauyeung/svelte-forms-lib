<script>
  import {getContext} from 'svelte';
  import {derived} from 'svelte/store';
  import {key} from './key';

  export let name;
  export let type = 'text';

  const {form, handleChange, errors} = getContext(key);

  export const error = derived(errors, ($errors) => $errors[name]);
</script>

<input
  {name}
  {type}
  value={$form[name]}
  on:change={handleChange}
  on:blur={handleChange}
  {...$$props}
/>
