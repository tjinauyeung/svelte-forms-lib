<script>
  import {getContext} from 'svelte';
  import {key} from './key';

  export let name;

  const {form, handleChange} = getContext(key);
</script>

<!-- There is a weird error when prettier formats this so we ignore it -->
<!-- prettier-ignore -->
<textarea {name} {...$$props} on:change={handleChange} on:blur={handleChange}>{$form[name]}</textarea>
