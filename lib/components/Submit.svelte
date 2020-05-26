<script>
import { getContext } from "svelte";
import { key } from "./key";

const { state, updateTouched } = getContext(key);

console.log($state)
for(let field in $state.touched) {
  console.log(field)
}

</script>

<button {...$$props} type="submit" disabled={!$state.isValid}>
  <slot />
</button>
