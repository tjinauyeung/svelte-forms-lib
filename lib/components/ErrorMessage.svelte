<script>
  import {getContext} from 'svelte';
  import {key} from './key';
  import {get} from './utils';

  export let name;

  const {errors} = getContext(key);
</script>

{#if get($errors, name)}
  <small {...$$props}>{get($errors, name)}</small>
{/if}
