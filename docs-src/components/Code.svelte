<script>
  import { onMount } from 'svelte';
  export let code;

  let pre;
  onMount(() => {
    pre.innerHTML = code;
  })
</script>

<pre bind:this={pre}></pre>
