<script>
  import { createForm } from "svelte-forms-lib";
  import yup from "yup";
  import Code from "../../components/Code.svelte";
  import { source, highlight } from "./source";

  const { form, errors, state, handleChange, handleSubmit } = createForm({
    initialValues: {
      name: "",
      email: ""
    },
    validationSchema: yup.object().shape({
      name: yup.string().required(),
      email: yup
        .string()
        .email()
        .required()
    }),
    onSubmit: values => {
      alert(JSON.stringify(values, null, 2));
    }
  });
</script>

<h1>Yup validation</h1>
<hr/>
<p>
  Example using <a href="https://github.com/jquense/yup" target="_blank">Yup</a> as validation. Validation happens when input changes and upon form submission.
</p>

<form on:submit={handleSubmit}>
  <label for="name">name</label>
  <input
    id="name"
    name="name"
    on:change={handleChange}
    on:blur={handleChange}
    bind:value={$form.name} />
  {#if $errors.name}
    <small>{$errors.name}</small>
  {/if}

  <label for="email">email</label>
  <input
    id="email"
    name="email"
    on:change={handleChange}
    on:blur={handleChange}
    bind:value={$form.email} />
  {#if $errors.email}
    <small>{$errors.email}</small>
  {/if}

  <button type="submit">submit</button>
</form>

<Code {source} {highlight} />
