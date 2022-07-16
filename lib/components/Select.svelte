<script>
  import {getContext} from 'svelte';
  import {key} from './key';
  import {get} from './utils';

  export let name;

  const {form, handleChange} = getContext(key);
</script>

<select
  {name}
  value={get($form, name)}
  on:change={handleChange}
  on:blur={handleChange}
  {...$$props}
>
  <slot />
</select>
