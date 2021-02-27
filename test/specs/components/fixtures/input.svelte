<script>
  import {getContext} from 'svelte';
  import {key} from '../../../../lib';

  export let field;

  const context = getContext(key);
  const {form} = context;
</script>

<label for={field}>
  {field}
  <input type="text" id={field} name={field} bind:value={$form[field]} />
</label>
