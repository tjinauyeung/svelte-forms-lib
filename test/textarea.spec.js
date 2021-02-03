import {render as renderTl, fireEvent, waitFor} from '@testing-library/svelte';

import Form from '../lib/components/Form.svelte';
import Textarea from '../lib/components/Textarea.svelte';

const defaultProps = {
  initialValues: {
    description: '',
  },
  ['onSubmit']: () => {},
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
    expect(textarea.value.trim()).toBe(props.initialValues.description);

    const value = 'foo';

    await fireEvent.change(textarea, {target: {value}});

    expect(textarea.value).toContain(value);
  });
});
