<script>
  import {getContext} from 'svelte';
  import {key} from './key';

  let {name, children, ...restProps} = $props();

  const {form, handleChange} = getContext(key);
</script>

<select
  {name}
  value={$form[name]}
  onchange={handleChange}
  onblur={handleChange}
  {...restProps}
>
  {@render children()}
</select>
