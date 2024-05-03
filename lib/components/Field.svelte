<script>
  import {getContext} from 'svelte';
  import {key} from './key';

  let {name, type, ...restProps} = $props();

  const {form, handleChange} = getContext(key);
</script>

<input
  {name}
  {type}
  value={$form[name]}
  onchange={handleChange}
  onblur={handleChange}
  {...restProps}
/>
