<script>
  import { Form, Field, ErrorMessage } from "svelte-forms-lib";
  import Code from './Code.svelte';
  import { code } from '../code/Helpers';
  import yup from "yup";

  const formProps = {
    initialValues: { name: "", email: "" },
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
  };
</script>

<p>Example Form, Field and ErrorMessage helper components.</p>

<Form {...formProps}>
  <label>name</label>
  <Field name="name" />
  <ErrorMessage name="name" />

  <label>email</label>
  <Field name="email" />
  <ErrorMessage name="email" />

  <button type="submit">submit</button>
</Form>

<Code code={code} />
