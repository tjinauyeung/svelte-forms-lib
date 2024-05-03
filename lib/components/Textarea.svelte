<script>
  import {getContext} from 'svelte';
  import {key} from './key';

  let {name, ...restProps} = $props();

  const {form, handleChange} = getContext(key);
</script>

<!-- prettier-ignore -->
<textarea {name} onchange={handleChange} onblur={handleChange} {...restProps}>{$form[name]}</textarea>
