import Prism from "prismjs";
import "prism-svelte";

export const source = `
  <script>
    import { createForm } from "svelte-forms-lib";
    import yup from "yup";

    const {
      form,
      errors,
      state,
      handleChange,
      handleSubmit,
      handleReset
    } = createForm({
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
        alert(JSON.stringify(values));
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

  <style>
    .error {
      display: block;
      color: red;
    }
    .form-group {
      display: flex;
      align-items: baseline;
    }
    .button-group {
      display: flex;
    }
    button ~ button {
      margin-left: 15px;
    }
  </style>

  <form>
    <h1>Add users</h1>

    {#each $form.users as user, j}
      <div class="form-group">
        <div>
          <input
            name={\`users[\${j}].name\`}
            placeholder="name"
            on:change={handleChange}
            on:blur={handleChange}
            bind:value={$form.users[j].name}
          />
          {#if $errors.users[j].name}
            <small class="error">{$errors.users[j].name}</small>
          {/if}
        </div>

        <div>
          <input
            placeholder="email"
            name={\`users[\${j}].email\`}
            on:change={handleChange}
            on:blur={handleChange}
            bind:value={$form.users[j].email}
          />
          {#if $errors.users[j].email}
            <small class="error">{$errors.users[j].email}</small>
          {/if}
        </div>

        {#if j === $form.users.length - 1}
          <button type="button" on:click={add}>+</button>
        {/if}
        {#if $form.users.length !== 1}
          <button type="button" on:click={remove(j)}>-</button>
        {/if}
      </div>
    {/each}

    <div class="button-group">
      <button type="button" on:click={handleSubmit}>submit</button>
      <button type="button" on:click={handleReset}>reset</button>
    </div>
  </form>
`;

export const highlight = Prism.highlight(source, Prism.languages.svelte, "svelte");
