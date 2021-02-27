<script>
  import {getContext} from 'svelte';
  import {key} from '../../../../lib';

  const context = getContext(key);

  export let storeProp;

  const store = context[storeProp];
</script>

<div {...$$restProps}>
  {JSON.stringify($store)}
</div>
