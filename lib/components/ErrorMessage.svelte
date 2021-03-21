<script>
  import {getContext} from 'svelte';
  import {key} from './key';

  export let name;

  const {errors} = getContext(key);
</script>

{#if $errors[name]}
  <small {...$$props}>{$errors[name]}</small>
{/if}
