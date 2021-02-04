import type {SvelteComponentTyped} from 'svelte';
import type {Readable, Writable} from 'svelte/store';
import type {ObjectSchema} from 'yup';

/**
 * Unfortunately svelte currently does not support generics in components so we export it to use it in scripts like this
 *
 * const formProps: FormProps = {
 *  intitialValues: {...},
 *  onSubmit: values => {...} -> values will be inffered from initialValues
 * }
 *
 * */
export type FormProps<Inf = Record<string, unknown>> = {
  class?: string;
  initialValues: Inf;
  onSubmit: ((values: Inf) => any) | ((values: Inf) => Promise<any>);
  validate?: (values: Inf) => any | undefined;
  validationSchema?: ObjectSchema<any>;
};

type FieldProps = {
  name: string;
  type?: string;
  value?: string;
};

type SelectProps = {
  name: string;
  class?: string;
  value?: string;
};

type ErrorProps = {
  name: string;
  class?: string;
};

type TextareaProps = {
  name: string;
  class?: string;
  cols?: number;
  rows?: number;
};

declare function createForm<Inf = Record<string, unknown>>(formProps: {
  initialValues: Inf;
  onSubmit: (values: Inf) => any | Promise<any>;
  validate?: (values: Inf) => any | undefined;
  validationSchema?: ObjectSchema<any>;
}): {
  form: Writable<Inf>;
  errors: Writable<Record<keyof Inf, string>>;
  touched: Writable<Record<keyof Inf, boolean>>;
  modified: Readable<Record<keyof Inf, boolean>>;
  isValid: Readable<boolean>;
  isSubmitting: Writable<boolean>;
  isValidating: Writable<boolean>;
  isModified: Readable<boolean>;
  updateField: (field: keyof Inf, value: any) => void;
  updateValidateField: (field: keyof Inf, value: any) => void;
  updateTouched: (field: keyof Inf, value: any) => void;
  validateField: (field: keyof Inf) => Promise<any>;
  updateInitialValues: (newValues: Inf) => void;
  handleReset: () => void;
  state: Readable<{
    form: Inf;
    errors: Record<keyof Inf, string>;
    touched: Record<keyof Inf, boolean>;
    modified: Record<keyof Inf, boolean>;
    isValid: boolean;
    isSubmitting: boolean;
    isValidating: boolean;
    isModified: boolean;
  }>;
  handleChange: () => void;
  handleSubmit: () => any;
};

declare class Form extends SvelteComponentTyped<
  FormProps & {
    class?: string;
  },
  {},
  {default: any}
> {}

declare class Field extends SvelteComponentTyped<FieldProps, {}, {}> {}

declare class Textarea extends SvelteComponentTyped<TextareaProps, {}, {}> {}

declare class Select extends SvelteComponentTyped<
  SelectProps,
  {},
  {default: any}
> {}

declare class ErrorMessage extends SvelteComponentTyped<
  ErrorProps,
  {},
  {default: any}
> {}

export {createForm, Form, Field, Select, ErrorMessage, Textarea};
