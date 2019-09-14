<script>
  import { getContext } from "svelte";
  import { key } from "./key";

  export let name;

  const { form, handleChange } = getContext(key);
</script>

<input type="text" {name} bind:value={$form[name]} on:change={handleChange} {...$$props} />
