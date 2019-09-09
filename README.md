
<p style="margin: 40px 0; text-align: center">
  <img src="./website/assets/logo.png" height="40px" title="Svelte forms lib logo" alt="Svelte forms lib logo" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/svelte-forms-lib">
    <img src="https://img.shields.io/npm/v/svelte-forms-lib.svg" alt="npm version">
  </a>
  <a href="https://www.npmjs.com/package/svelte-forms-lib">
    <img src="https://img.shields.io/npm/dm/svelte-forms-lib.svg" alt="npm downloads">
  </a>
  <a href="https://bundlephobia.com/result?p=svelte-forms-lib">
    <img src="https://img.shields.io/bundlephobia/min/svelte-forms-lib.svg" alt="minified size">
  </a>
  <a href="https://opensource.org/licenses/MIT">
    <img src="https://img.shields.io/npm/l/svelte-forms-lib.svg" alt="license">
  </a>
  <a href="https://github.com/tjinauyeung/svelte-forms-lib/issues">
    <img src="https://img.shields.io/github/issues/tjinauyeung/svelte-forms-lib.svg" alt="issues">
  </a>
  <a href="https://github.com/tjinauyeung/svelte-forms-lib/pulls">
    <img src="https://img.shields.io/github/issues-pr/tjinauyeung/svelte-forms-lib.svg" alt="pull requests">
  </a>
</p>

<p align="center">
  Svelte forms lib is a lightweight library for managing forms in Svelte, with an [Formik](https://github.com/jaredpalmer/formik) like API.
</p>

## Examples

For examples see the [examples](https://github.com/tjinauyeung/svelte-forms-lib/tree/master/examples) folder in or run

```bash
npm run start:examples
```

open up in the browser to see the examples.

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

### Handling form arrays

Svelte forms lib also support form arrays and nested fields. The name attribute in the inputs accept path like strings i.e. `users[1].name` which allow us to bind to nested properties if the form requires it. See example below. Validation still works as expected.

```svelte
<script>
  import createForm from "svelte-forms-lib";
  import yup from "yup";

  const { form, errors, state, handleChange, handleSubmit, handleReset } = createForm({
    initialValues: {
      users: [
        {
          name: "",
          email: ""
        }
      ]
    },
    validationSchema: yup.object().shape({
      users: yup.array().of(
        yup.object().shape({
          name: yup.string().required(),
          email: yup
            .string()
            .email()
            .required()
        })
      )
    }),
    onSubmit: values => {
      // make form submission request with `values`
    }
  });

  const add = () => {
    $form.users = $form.users.concat({ name: "", email: "" });
    $errors.users = $errors.users.concat({ name: "", email: "" });
  };

  const remove = i => () => {
    $form.users = $form.users.filter((u, j) => j !== i);
    $errors.users = $errors.users.filter((u, j) => j !== i);
  };
</script>

<form>
  {#each $form.users as user, j}
    <label>name</label>
    <input
      name={`users[${j}].name`}
      bind:value={$form.users[j].name}
      on:change={handleChange} />
    {#if $errors.users[j].name}
      <hint>{$errors.users[j].name}</hint>
    {/if}

    <label>email</label>
    <input
      name={`users[${j}].email`}
      bind:value={$form.users[j].email}
      on:change={handleChange} />
    {#if $errors.users[j].email}
      <hint>{$errors.users[j].email}</hint>
    {/if}

    <button on:click={add}>+</button>
    <button on:click={remove(j)}>-</button>
  {/each}

  <button on:click={handleSubmit}>submit</button>
  <button on:click={handleReset}>reset</button>
</form>
```

### Contributions

Please feel free to submit any issue as means of feedback or create a PR for bug fixes / wanted features.
