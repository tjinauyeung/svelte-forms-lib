<script>
  import createForm from "svelte-forms-lib";
  let submitted = false;

  const { form, state, handleChange, handleSubmit } = createForm({
    initialValues: {
      name: "",
      email: ""
    },
    onSubmit: ({ values }) => {
      console.log("make form request:", values);
      submitted = true;
    }
  });
</script>

<form on:submit={handleSubmit}>
  <label for="name">name</label>
  <input
    id="name"
    name="name"
    on:change={handleChange}
    bind:value={$form.name} />

  <label for="email">email</label>
  <input
    id="email"
    name="email"
    on:change={handleChange}
    bind:value={$form.email} />

  <button type="submit">{submitted ? 'form submitted!' : 'submit'}</button>
</form>

<!-- print out state for debugging -->
<pre>{JSON.stringify($state, null, 2)}</pre>
