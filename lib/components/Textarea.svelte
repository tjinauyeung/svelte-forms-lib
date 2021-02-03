<script>
  import {getContext} from 'svelte';
  import {key} from './key';

  export let name;

  const {form, handleChange} = getContext(key);
</script>

<textarea {name} {...$$props} on:change={handleChange} on:blur={handleChange}>
  {$form[name]}
</textarea>
