import {render, fireEvent, waitFor} from '@testing-library/svelte';
import {writable, get as svelteGet} from 'svelte/store';

import Input from './fixtures/input.svelte';

import Form from 'lib/components/Form.svelte';

const defaultProps = {
  initialValues: {foo: ''},
  onSubmit() {},
};

const get = (store) => {
  /**
   * not sure why we need to invoke `get` twice, but we do
   */
  return svelteGet(svelteGet(store));
};

describe('Form', () => {
  test('-> exposes `form` prop via slot properties', async () => {
    const inputId = 'foo';
    const props = {
      ...defaultProps,
      initialValues: {[inputId]: ''},
    };
    let form = writable({});
    const {getByLabelText} = render(
      <Form {...props} let_form={form}>
        <Input field={inputId} />
      </Form>,
    );
    const input = getByLabelText(inputId);

    expect(get(form)).toHaveProperty('foo', '');

    const value = 'bar';

    await fireEvent.input(input, {target: {value}});

    expect(get(form)).toHaveProperty('foo', value);
  });

  test('-> exposes `state` prop via slot properties', async () => {
    const inputId = 'foo';
    const props = {
      ...defaultProps,
      initialValues: {[inputId]: ''},
    };
    let state = writable({});
    const {getByLabelText} = render(
      <Form {...props} let_state={state}>
        <Input field={inputId} />
      </Form>,
    );
    const input = getByLabelText(inputId);

    expect(get(state)).toHaveProperty('isModified', false);

    const value = 'bar';

    await fireEvent.input(input, {target: {value}});

    expect(get(state)).toHaveProperty('isModified', true);
  });

  test.each`
    methodName
    ${'handleChange'}
    ${'handleSubmit'}
    ${'updateField'}
    ${'updateInitialValues'}
    ${'updateTouched'}
    ${'updateValidateField'}
    ${'validateField'}
  `('-> exposes $methodName via slot properties', ({methodName}) => {
    const inputId = 'foo';
    const methodSetter = jest.fn();
    const props = {
      ...defaultProps,
      initialValues: {[inputId]: ''},
      [`let_${methodName}`]: methodSetter,
    };
    render(
      <Form {...props}>
        <Input field={inputId} />
      </Form>,
    );

    expect(methodSetter.mock.calls[0][0]).toBeInstanceOf(Function);
    expect(methodSetter.mock.calls[0][0]).toHaveProperty('name', methodName);
  });
});
