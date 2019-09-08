import { Schema } from "yup";

export interface ValidationErrors {
  [fieldName: string]: ValidationErrorMsg;
}

export type ValidationErrorMsg = string;

export interface Config {
  initialValues: object;
  validationSchema: Schema<{}>;
  validate?: (formValue: object) => ValidationErrors;
  onSubmit: (formValue: object) => Promise<{}>;
}

export interface Observable<T> {
  subscribe: (T) => () => void;
}

export interface Form {
  form: Observable<object>;
  errors: Observable<ValidationErrors>;
  touched: Observable<object>;
  isValid: Observable<boolean>;
  isSubmitting: Observable<boolean>;
  isValidating: Observable<boolean>;
  handleChange: (event?: Event) => void;
  handleSubmit: (event?: Event) => void;
  handleReset: (event?: Event) => void;
  updateField: (field: string, value: string | number | boolean) => void;
  updateTouched: (field: string, value: string | number | boolean) => void;
  unsubscribe: () => void;
  state: Observable<{
    form: object;
    errors: ValidationErrors;
    touched: object;
    isValid: boolean;
    isSubmitting: boolean;
    isValidating: boolean;
  }>;
}
