<script>
  import { getContext } from "svelte";
  import { key } from "./key";

  export let name;
  export let type = "text";

  const { form, handleChange } = getContext(key);
</script>

<input
  {name}
  type={type}
  value={$form[name]}
  checked={$form[name]}
  on:change={handleChange}
  on:blur={handleChange}
  {...$$props} />
