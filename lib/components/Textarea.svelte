<script>
  import {getContext} from 'svelte';
  import {key} from './key';
  import {get} from './utils';

  export let name;

  const {form, handleChange} = getContext(key);
</script>

<!-- prettier-ignore -->
<textarea {name} on:change={handleChange} on:blur={handleChange} {...$$props}>{get($form, name)}</textarea>
