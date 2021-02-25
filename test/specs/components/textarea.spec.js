import {render as renderTl, fireEvent, waitFor} from '@testing-library/svelte';

import Form from 'lib/components/Form.svelte';
import Textarea from 'lib/components/Textarea.svelte';

const defaultProps = {
  initialValues: {
    description: '',
  },
  onSubmit() {},
};

const render = (ui, props = defaultProps) => {
  return renderTl(<Form {...props}>{ui}</Form>, {props});
};

describe('Textarea', () => {
  test('-> updates value on change', async () => {
    const label = 'description';
    const props = {...defaultProps};
    const {getByLabelText} = render(
      <>
        <label for={label}>{label}</label>
        <Textarea id={label} name={label} />
      </>,
      props,
    );
    const textarea = getByLabelText(label);
    const value = 'foo';

    expect(textarea.value.trim()).toBe(props.initialValues.description);

    await fireEvent.change(textarea, {target: {value}});

    expect(textarea.value).toContain(value);
  });

  test('-> changed value is in submitted values', async () => {
    const label = 'description';
    const submitSpy = jest.fn();
    const values = {[label]: ''};
    const props = {initialValues: {...values}, onSubmit: submitSpy};
    const {getByLabelText, getByRole} = render(
      <>
        <label for={label}>{label}</label>
        <Textarea id={label} name={label} />

        <button type="submit">submit</button>
      </>,
      props,
    );

    const textarea = getByLabelText(label);
    const submitButton = getByRole('button');
    const newValue = 'foo';

    await fireEvent.change(textarea, {target: {value: newValue}});
    await fireEvent.click(submitButton);

    await waitFor(() =>
      expect(submitSpy.mock.calls[0][0]).toHaveProperty(label, newValue),
    );
  });
});
