<script>
  import {getContext} from 'svelte';
  import {key} from './key';

  let {name, ...restProps} = $props();

  const {errors} = getContext(key);
</script>

{#if $errors[name]}
  <small {...restProps}>{$errors[name]}</small>
{/if}
