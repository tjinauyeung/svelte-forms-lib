<script>
  import { Form, Field, ErrorMessage } from "svelte-forms-lib";
  import Code from "../../components/Code.svelte";
  import { source, highlight } from "./source";
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

<h1>Using helper components</h1>
<hr />
<p>
  Example <span>Form</span>, <span>Field</span> and <span>ErrorMessage</span> helper components.
</p>

<Form {...formProps}>
  <label>name</label>
  <Field name="name" />
  <ErrorMessage name="name" />

  <label>email</label>
  <Field name="email" />
  <ErrorMessage name="email" />

  <button type="submit">submit</button>
</Form>

<Code {source} {highlight} />
