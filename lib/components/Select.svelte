<script>
  import {getContext} from 'svelte';
  import {key} from './key';

  export let name;

  const {form, handleChange} = getContext(key);
</script>

<select
  {name}
  value={$form[name]}
  on:change={handleChange}
  on:blur={handleChange}
  {...$$props}
>
  <slot />
</select>
