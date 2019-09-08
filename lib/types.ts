import { Schema } from "yup";
import { Writable, Readable } from "svelte/store";

export interface FormValidationErrors {
  [fieldName: string]: FormValidationErrorMsg;
}

export type FormValidationErrorMsg = string;

export interface FormTouched {
  [fieldName: string]: boolean;
}

export interface FormConfig {
  initialValues: object;
  validationSchema: Schema<{}>;
  validate?: (formValue: object) => FormValidationErrors;
  onSubmit: (
    values: object,
    form: Writable<object>,
    errors: Writable<FormValidationErrors>
  ) => Promise<{}>;
}

export interface FormState {
  form: Writable<object>;
  errors: Writable<FormValidationErrors>;
  touched: Writable<object>;
  isValid: Readable<boolean>;
  isSubmitting: Writable<boolean>;
  isValidating: Writable<boolean>;
  handleChange: (event?: Event) => void;
  handleSubmit: (event?: Event) => void;
  handleReset: (event?: Event) => void;
  updateField: (field: string, value: string | number | boolean) => void;
  updateTouched: (field: string, value: string | number | boolean) => void;
  unsubscribe: () => void;
  state: Readable<{
    form: object;
    errors: FormValidationErrors;
    touched: object;
    isValid: boolean;
    isSubmitting: boolean;
    isValidating: boolean;
  }>;
}
