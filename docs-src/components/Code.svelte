<script>
  import { onMount } from "svelte";
  export let highlight;
  export let source;

  let pre;
  onMount(() => {
    pre.innerHTML = highlight;
  });

  let copyText = "copy";

  function copy() {
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.value = source;
    textarea.select();

    try {
      const success = document.execCommand("copy");
      if (success) {
        copyText = "copied!";
      }
      setTimeout(() => {
        copyText = "copy";
      }, 2000);
    } catch (err) {
      console.log("Oops, unable to copy");
    }

    document.body.removeChild(textarea);
  }
</script>

<style>
  .wrapper {
    position: relative;
    cursor: pointer;
  }

  .wrapper:hover .copy {
    opacity: 1;
  }

  .copy {
    opacity: 0;
    background: #fff;
    color: #000;
    padding: 10px 14px;
    border-radius: 4px;
    display: block;
    position: absolute;
    top: 20px;
    right: 20px;
    pointer-events: none;
  }

  .heading {
    position: absolute;
    text-transform: uppercase;
    letter-spacing: 2px;
    top: 35px;
    left: 40px;
    font-size: 14px;
    font-weight: bold;
    color: #c7c7d4;
  }

  pre {
    background: var(--secondary);
    padding: 50px 20px 40px;
    border-radius: 12px;
    line-height: 1.8;
    overflow: scroll;
    font-size: 16px;
    color: #fff;
    font-family: Roboto Mono, monospace;
  }
</style>

<div class="wrapper">
  <h1 class="heading">code</h1>
  <pre bind:this={pre} on:click={copy} />
  <div class="copy">{copyText}</div>
</div>
