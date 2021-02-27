import {render, fireEvent, waitFor} from '@testing-library/svelte';

import Input from './fixtures/input.svelte';
import StoreContextInspector from './fixtures/store-context-inspector.svelte';

import Form from 'lib/components/Form.svelte';

const defaultProps = {
  initialValues: {foo: ''},
  onSubmit() {},
};

describe('Form', () => {
  test('-> exposes `form` store to children via context', async () => {
    const inputId = 'foo';
    const props = {
      ...defaultProps,
      initialValues: {[inputId]: ''},
    };
    const {getByLabelText, getByTestId} = render(
      <Form {...props}>
        <Input field={inputId} />

        <StoreContextInspector data-testid="values" storeProp="form" />
      </Form>,
    );
    const input = getByLabelText(inputId);
    const valuesEl = getByTestId('values');
    let values = JSON.parse(valuesEl.textContent);

    expect(values[inputId]).toBe(props.initialValues[inputId]);
    expect(input.value).toBe(values[inputId]);

    const value = 'bar';

    await fireEvent.input(input, {target: {value}});

    values = JSON.parse(valuesEl.textContent);

    expect(values[inputId]).toBe(value);
    expect(input.value).toBe(value);
  });

  test('-> exposes `state` store to children via context', async () => {
    const inputId = 'foo';
    const props = {
      ...defaultProps,
      initialValues: {[inputId]: ''},
    };
    const {getByLabelText, getByTestId} = render(
      <Form {...props}>
        <Input field={inputId} />

        <StoreContextInspector data-testid="state" storeProp="state" />
      </Form>,
    );
    const input = getByLabelText(inputId);
    const stateEl = getByTestId('state');
    let state = JSON.parse(stateEl.textContent);

    expect(state).toHaveProperty('isModified', false);

    const value = 'bar';

    await fireEvent.input(input, {target: {value}});

    state = JSON.parse(stateEl.textContent);
    expect(state).toHaveProperty('isModified', true);
  });

  test('-> exposes `errors` store to children via context', async () => {
    const inputId = 'foo';
    const validationError = `${inputId} is required`;
    const props = {
      initialValues: {[inputId]: ''},
      validate: (values) => {
        if (!values[inputId]) {
          return {[inputId]: validationError};
        }
      },
    };
    const {getByTestId, getByLabelText, getByRole} = render(
      <Form {...props}>
        <Input field={inputId} />
        <StoreContextInspector data-testid="error" storeProp="errors" />

        <button type="submit">submit</button>
      </Form>,
    );
    const input = getByLabelText(inputId);
    const button = getByRole('button');
    const errorEl = getByTestId('error');
    let errors = JSON.parse(errorEl.textContent);

    expect(errors).toHaveProperty(inputId, '');

    await fireEvent.click(button);

    await waitFor(() => {
      errors = JSON.parse(errorEl.textContent);
      expect(errors).toHaveProperty(inputId, validationError);
    });

    const value = 'bar';

    await fireEvent.input(input, {target: {value}});
    await fireEvent.click(button);

    await waitFor(() => {
      errors = JSON.parse(errorEl.textContent);
      expect(errors).toHaveProperty(inputId, '');
    });
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
