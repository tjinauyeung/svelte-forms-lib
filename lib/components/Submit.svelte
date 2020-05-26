<script>
import { getContext } from "svelte";
import { key } from "./key";

const { state } = getContext(key);

</script>

<button {...$$props} type="submit" disabled={!$state.isValid}>
  <slot />
</button>
