<script>
  import { Form, Field, ErrorMessage } from "svelte-forms-lib";
  import yup from "yup";
</script>

<Form
  initialValues={{ name: '', email: '' }}
  validationSchema={yup.object().shape({ name: yup.string().required(), email: yup
      .string()
      .email()
      .required() })}
  onSubmit={values => {
    alert(JSON.stringify(values, null, 2));
  }}>
  <label>name</label>
  <Field name="name" />
  <ErrorMessage name="name" />

  <label>email</label>
  <Field name="email" />
  <ErrorMessage name="email" />

  <button type="submit">submit</button>
</Form>
