import Prism from "prismjs";
import "prism-svelte";

export const source = `
  <script>
    import { createForm } from "svelte-forms-lib";

    const { form, state, handleChange, handleSubmit } = createForm({
      initialValues: {
        name: "",
        email: ""
      },
      onSubmit: values => {
        alert(JSON.stringify(values));
      }
    });
  </script>

  <form on:submit={handleSubmit}>
    <label for="name">name</label>
    <input
      id="name"
      name="name"
      on:change={handleChange}
      bind:value={$form.name}
    />
    <label for="email">email</label>
    <input
      id="email"
      name="email"
      on:change={handleChange}
      bind:value={$form.email}
    />
    <button type="submit">Submit</button>
  </form>
`;

export const highlight = Prism.highlight(source, Prism.languages.svelte, "svelte");
