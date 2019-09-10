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
      console.log("make form request:", values);
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
    font-size: 12px;
  }
  .form-group {
    display: flex;
    align-items: baseline;
  }
  .form-title {
    font-size: 18px;
    font-weight: 600;
    margin: 0;
  }
  .push-right {
    margin-right: 15px;
  }
  .flex {
    display: flex;
  }
</style>

<form>
  <h1 class="form-title">Add users</h1>

  {#each $form.users as user, j}
    <div class="form-group">
      <div class="push-right">
        <input
          name={`users[${j}].name`}
          placeholder="name"
          on:change={handleChange}
          on:blur={handleChange}
          bind:value={$form.users[j].name} />
        {#if $errors.users[j].name}
          <hint class="error">{$errors.users[j].name}</hint>
        {/if}
      </div>

      <div class="push-right">
        <input
          placeholder="email"
          name={`users[${j}].email`}
          on:change={handleChange}
          on:blur={handleChange}
          bind:value={$form.users[j].email} />
        {#if $errors.users[j].email}
          <hint class="error">{$errors.users[j].email}</hint>
        {/if}
      </div>

      {#if j === $form.users.length - 1}
        <button type="button" class="push-right" on:click={add}>+</button>
      {/if}
      {#if $form.users.length !== 1}
        <button type="button" on:click={remove(j)}>-</button>
      {/if}
    </div>
  {/each}

  <div class="flex">
    <button type="button" class="push-right" on:click={handleSubmit}>submit</button>
    <button type="button" on:click={handleReset}>reset</button>
  </div>
</form>

<!-- print out state for debugging -->
<pre>{JSON.stringify($state, null, 2)}</pre>
