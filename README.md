# Svelte forms lib

This is a lightweight library for managing forms in Svelte, with an Formik inspired API.

## Installation

This module is distributed via npm which is bundled with node and
should be installed as one of your project's `dependencies`:

```
npm install svelte-forms-lib
```

> This package also depends on `svelte`. Please make sure you
> have those installed as well.

## Usage

```svelte
<script>
  import { createForm } from "svelte-forms-lib";

  const { form, handleChange, handleSubmit } = createForm({
    initialValues: {
      name: "",
      email: ""
    },
    onSubmit: values => {
      // make form submission request with `values`
    }
  })
</script>

<form on:submit={handleSubmit}>
  <label for="name">Name</label>
  <input
    type="text"
    name="name"
    bind:value={$form.name}
    on:change={handleChange}
  />

  <label>Email</label>
  <input
    type="email"
    name="email"
    bind:value={$form.email}
    on:change={handleChange}
  />

  <button type="submit">Submit</button>
</form>
```

The `createForm` function requires at minimum a form object which contains the initial state of the form.

### Validation with Yup

This library works best with `yup` for object validation.

```svelte
<script>
  import { createForm } from "svelte-forms-lib";
  import yup from "yup";

  const { form, errors, handleChange, handleSubmit } = createForm({
    initialValues: {
      name: "",
      email: ""
    },
    validationSchema: yup.object().shape({
      name: yup.string().required(),
      email: yup.string().email().required()
    }),
    onSubmit: payload => {
      // make request for payload
    }
  })
</script>

<form on:submit={handleSubmit}>
  <label for="name">Name</label>
  <input
    type="text"
    name="name"
    bind:value={$form.name}
    on:change={handleChange}
  />
  {#if $errors.name}
    <small>{$errors.name}</small>
  {/if}

  <label for="email">Email</label>
  <input
    type="email"
    name="email"
    bind:value={$form.email}
    on:change={handleChange}
  />
  {#if $errors.email}
    <small>{$errors.email}</small>
  {/if}

  <button>Submit</button>
</form>
```
