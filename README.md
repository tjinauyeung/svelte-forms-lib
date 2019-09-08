# Svelte forms lib

This is a lightweight library for managing forms in Svelte, with an Formik inspired API.

## Installation

This module is distributed via npm which is bundled with node and
should be installed as one of your project's `dependencies`:

```bash
npm install svelte-forms-lib
```

> This package also depends on `svelte`. Please make sure you have it installed as well.

## Usage

```svelte
<script>
  import createForm from "svelte-forms-lib";

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

The `createForm` function requires at minimum a `initialValues` object which contains the initial state of the form and a `submit` function which will be called upon submitting the form.

## Observables 

Because the library is built using the Store API in Svelte, the values exposed by `createForm` are observables.

```js
// all observables returned by `createForm`
const { form, errors, touched, isValid, isSubmitting, isValidating, state } = createForm({...})
```

Within the template they can be read using the `$` prefix i.e. `$form`, `$errors`. For example to access `isValid` we'll use the `$` prefix in the template

```svelte
<p>This form is {$isValid} </p>
```

## Validation

### Using Yup

This library works best with [yup](https://github.com/jquense/yup) for form validation. 

```svelte
<script>
  import createForm from "svelte-forms-lib";
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
  {#if $errors.name}
    <em>{$errors.name}</em>
  {/if}

  <label for="email">Email</label>
  <input
    type="email"
    name="email"
    bind:value={$form.email}
    on:change={handleChange}
  />
  {#if $errors.email}
    <em>{$errors.email}</em>
  {/if}

  <button type="submit">Submit</button>
</form>
```

### Using custom validator

Custom validation is also possible:

```svelte
<script>
  import createForm from "svelte-forms-lib";
  import yup from "yup";

  const { form, errors, handleChange, handleSubmit } = createForm({
    initialValues: {
      name: "",
      email: ""
    },
    validate: values => {
      let error = {};
      if (values.name === '') {
        error.name = "Name is required"
      }
      if (values.email === '') {
        error.email = "Email is required"
      }
      return error;
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
  {#if $errors.name}
    <em>{$errors.name}</em>
  {/if}

  <label for="email">Email</label>
  <input
    type="email"
    name="email"
    bind:value={$form.email}
    on:change={handleChange}
  />
  {#if $errors.email}
    <em>{$errors.email}</em>
  {/if}

  <button type="submit">Submit</button>
</form>
```

Currently custom validation is only run when submitting the form. Field validation will be added in the near future.
