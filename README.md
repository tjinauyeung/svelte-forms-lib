# Svelte forms lib

This is a light weight library to help state management for forms in Svelte.

---

## Installation

This module is distributed via npm which is bundled with node and
should be installed as one of your project's `dependencies`:

```
npm install svelte-forms-lib
```

> This package also depends on `svelte`. Please make sure you
> have those installed as well.

## Usage

> [Try it out in the browser](https://codesandbox.io/s/n9095)

```svelte
<script>
  import { createForm } from "svelte-forms-lib";

  const { form, handleChange, handleSubmit } = createForm({
    form: {
      name: "",
      email: ""
    },
    submit: payload => {
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

  <label>Email</label>
  <input
    type="email"
    name="email"
    bind:value={$form.email}
    on:change={handleChange}
  />

  <button>Submit</button>
</form>
```

The `createForm` function requires at minimum a form object which contains the initial state of the form.

### Validation

This library works best with `yup` for object validation

```svelte
<script>
  import { createForm } from "svelte-forms-lib";
  import yup from "yup";

  const { form, errors, handleChange, handleSubmit } = createForm({
    form: {
      name: "",
      email: ""
    },
    schema: yup.object().shape({
      name: yup.string().required(),
      email: yup.string().email().required()
    }),
    submit: payload => {
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
