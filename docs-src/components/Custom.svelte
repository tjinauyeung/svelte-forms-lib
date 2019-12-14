<script>
  import { createForm } from "svelte-forms-lib";
  import { code } from '../code/Custom';
  import Code from './Code.svelte';
  import yup from "yup";

  const { form, errors, state, handleChange, handleSubmit } = createForm({
    initialValues: {
      name: "",
      email: ""
    },
    validate: values => {
      let errs = {};
      if (values.name === "") {
        errs["name"] = "custom validation: name is required";
      }
      if (values.email === "") {
        errs["email"] = "custom validation: email is required";
      }
      return errs;
    },
    onSubmit: values => {
      alert(JSON.stringify(values));
    }
  });
</script>

<h1>Custom validation</h1>
<p>
  Example using Yup as validation. The validate function allows for custom validation. Validation is
  only fired upon submission. Field validation coming soon.
</p>

<form on:submit={handleSubmit}>
  <label for="name">name</label>
  <input id="name" name="name" on:change={handleChange} bind:value={$form.name} />
  {#if $errors.name}
    <hint class="error">{$errors.name}</hint>
  {/if}

  <label for="email">email</label>
  <input id="email" name="email" on:change={handleChange} bind:value={$form.email} />
  {#if $errors.email}
    <hint class="error">{$errors.email}</hint>
  {/if}

  <button type="submit">submit</button>
</form>

<Code code={code} />
