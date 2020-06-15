const {createForm} = require('../build');
const yup = require('yup');
const Chance = require('chance');

const chance = new Chance();

function nonEmpty(array) {
  return array.filter((str) => str !== '');
}

function subscribeOnce(observable) {
  return new Promise((resolve) => {
    observable.subscribe(resolve)(); // immediately invoke to unsubscribe
  });
}

describe('createForm', () => {
  let instance;
  let initialValues = {
    name: chance.name(),
    email: chance.email(),
    country: chance.country(),
  };
  let validationSchema = yup.object().shape({
    name: yup.string().required(),
    email: yup.string().email().required(),
    country: yup.string().required(),
  });
  let onSubmit = jest.fn();

  function getInstance(options = {}) {
    return createForm({
      initialValues: options.initialValues || initialValues,
      validationSchema: options.validationSchema || validationSchema,
      onSubmit: options.onSubmit || onSubmit,
    });
  }

  beforeEach(() => {
    instance = getInstance();
  });

  describe('config', () => {
    it('requires initialValues to be provided and not to be empty', () => {
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      const initialValues = {};
      const config = {initialValues, onSubmit: jest.fn()};

      createForm(config);
      expect(consoleWarn).toBeCalledWith(
        'createForm requires initialValues to be a non empty object or array, provided {}',
      );
    });
  });

  describe('$form', () => {
    it('returns an observable with a subscribe method', () => {
      expect(instance.form.subscribe).toBeDefined();
    });

    it('contains the current values which are accessed by subscription', () => {
      subscribeOnce(instance.form).then((values) => {
        expect(values.name).toBe(initialValues.name);
        expect(values.email).toBe(initialValues.email);
        expect(values.country).toBe(initialValues.country);
      });
    });
  });

  describe('$errors', () => {
    it('returns an observable with a subscribe method', () => {
      expect(instance.errors.subscribe).toBeDefined();
    });

    it('contains the current values which are accessed by subscription', () => {
      subscribeOnce(instance.errors).then((errors) => {
        expect(errors.name).toBe('');
        expect(errors.email).toBe('');
        expect(errors.country).toBe('');
      });
    });
  });

  describe('$touched', () => {
    it('returns an observable with a subscribe method', () => {
      expect(instance.errors.subscribe).toBeDefined();
    });

    it('contains the current values which are accessed by subscription', () => {
      subscribeOnce(instance.touched).then((touched) => {
        expect(touched.name).toBe(false);
        expect(touched.email).toBe(false);
        expect(touched.country).toBe(false);
      });
    });
  });

  describe('$isValid', () => {
    it('returns an observable with a subscribe method', () => {
      expect(instance.isValid.subscribe).toBeDefined();
    });

    it('returns false if form is invalid', () => {
      instance = getInstance({
        name: '',
        email: '',
        country: '',
      });
      subscribeOnce(instance.isValid).then((isValid) =>
        expect(isValid).toBe(false),
      );
    });

    it('returns false if some fields are untouched', async () => {
      const touched = await subscribeOnce(instance.touched);
      const someUntouched = Object.values(touched).some((val) => val === false);
      expect(someUntouched).toBe(true);

      const isValid = await subscribeOnce(instance.isValid);
      expect(isValid).toBe(false);
    });

    it('returns true if form is valid and all fields touched', () => {
      instance.touched.set({
        name: true,
        email: true,
        country: true,
      });
      subscribeOnce(instance.isValid).then((isValid) =>
        expect(isValid).toBe(true),
      );
    });
  });

  describe('handleReset', () => {
    it('resets form to initial state', () => {
      instance.form.set({name: 'foo'});
      subscribeOnce(instance.form).then((values) =>
        expect(values.name).toBe('foo'),
      );

      instance.handleReset();
      subscribeOnce(instance.form).then((form) =>
        expect(form.name).toBe(form.name),
      );
    });

    it('resets errors to initial state', () => {
      instance.errors.set({name: 'name is required'});
      subscribeOnce(instance.errors).then((errors) =>
        expect(errors.name).toBe('name is required'),
      );

      instance.handleReset();
      subscribeOnce(instance.errors).then((errors) =>
        expect(errors.name).toBe(''),
      );
    });

    it('resets touched to initial state', () => {
      instance.touched.set({name: true});
      subscribeOnce(instance.touched).then((touched) =>
        expect(touched.name).toBe(true),
      );

      instance.handleReset();
      subscribeOnce(instance.touched).then((touched) =>
        expect(touched.name).toBe(false),
      );
    });
  });

  describe('handleChange', () => {
    it('updates the form when connected to change handler of input', (done) => {
      subscribeOnce(instance.form).then((form) =>
        expect(form.email).toBe(initialValues.email),
      );
      const email = chance.email();
      const event = {
        target: {
          name: 'email',
          value: email,
        },
      };
      instance
        .handleChange(event)
        .then(() => subscribeOnce(instance.form))
        .then((form) => expect(form.email).toBe(email))
        .then(done);
    });

    it('uses checked value for checkbox inputs', (done) => {
      instance = getInstance({
        initialValues: {
          terms: false,
        },
        validationSchema: yup.object().shape({
          terms: yup.bool().oneOf([true]),
        }),
      });
      const event = {
        target: {
          name: 'terms',
          getAttribute: (type) => 'checkbox',
          checked: true,
        },
      };
      instance
        .handleChange(event)
        .then(() => subscribeOnce(instance.form))
        .then((form) => expect(form.terms).toBe(true))
        .then(done);
    });

    it('runs field validation when validateSchema is provided', (done) => {
      const invalid = 'invalid.email';
      const event = {
        target: {
          name: 'email',
          value: invalid,
        },
      };

      instance
        .handleChange(event)
        .then(() => subscribeOnce(instance.errors))
        .then(errors => expect(errors.email).toBe("email must be a valid email"))
        .then(done);
    });

    it('runs field validation when validateFn is provided', (done) => {
      const invalid = 'invalid.email';
      const event = {
        target: {
          name: 'email',
          value: invalid,
        },
      };
      const instance = createForm({
        initialValues: {
          email: '',
        },
        validate: (values) => {
          let errs = {};
          if (values.email === 'invalid.email') {
            errs.email = 'this email is invalid';
          }
          return errs;
        },
        onSubmit: (values) => console.log(values),
      });
      instance
        .handleChange(event)
        .then(() => subscribeOnce(instance.errors))
        .then((errors) => expect(errors.email).toBe('this email is invalid'))
        .then(done);
    });

    it('does not throw when no validationSchema or validateFn provided', () => {
      const event = {
        target: {
          name: 'email',
          value: 'foo',
        },
      };
      const instance = createForm({
        initialValues: {email: ''},
        onSubmit: console.log.bind(console),
      });

      expect(() => instance.handleChange(event)).not.toThrow();
    });

    it('assigns empty string to field if validateFn returns undefined', (done) => {
      const value = 'email@email.com';
      const event = {
        target: {
          name: 'email',
          value,
        },
      };
      const instance = createForm({
        initialValues: {
          email: '',
        },
        validate: (values) => undefined,
        onSubmit: (values) => console.log(values),
      });

      instance
        .handleChange(event)
        .then(() => subscribeOnce(instance.errors))
        .then((errors) => expect(errors.email).toBe(''))
        .then(done);
    });
  });

  describe('handleSubmit', () => {
    it('validates form on submit when validationSchema is provided', (done) => {
      instance = getInstance({
        initialValues: {
          name: '',
          email: '',
          country: '',
        },
      });

      subscribeOnce(instance.errors).then((errors) => {
        const errorValues = nonEmpty(Object.values(errors));
        expect(errorValues.length).toBe(0);
      });

      instance
        .handleSubmit()
        .then(() => subscribeOnce(instance.errors))
        .then((errors) => nonEmpty(Object.values(errors)))
        .then((errors) => expect(errors.length).toBe(3))
        .then(done);
    });

    it('calls onSubmit when form is valid', (done) => {
      expect(onSubmit).not.toBeCalled();
      instance.handleSubmit().then(expect(onSubmit).toBeCalled).then(done);
    });

    it('does not call onSubmit when form is invalid', (done) => {
      const onSubmit = jest.fn();
      // create invalid form
      instance = getInstance({
        initialValues: {name: ''},
        onSubmit,
      });
      instance.handleSubmit().then(expect(onSubmit).not.toBeCalled).then(done);
    });

    it('calls onSubmit with formValues, $form and $error', async () => {
      const onSubmit = jest.fn();
      instance = getInstance({onSubmit});

      await instance.handleSubmit();
      const [formValue, $form, $errors] = onSubmit.mock.calls[0]; // onSubmit callback args

      expect(formValue.name).toBe(initialValues.name);
      expect(formValue.email).toBe(initialValues.email);
      expect(formValue.country).toBe(initialValues.country);

      subscribeOnce($form).then((form) => {
        expect(form.name).toBe(initialValues.name);
        expect(form.email).toBe(initialValues.email);
        expect(form.country).toBe(initialValues.country);
      });

      subscribeOnce($errors).then((errors) => {
        expect(errors.name).toBe('');
        expect(errors.email).toBe('');
        expect(errors.country).toBe('');
      });
    });
  });

  describe('validateField', () => {
    it('validate a field only by name', (done) => {
      instance = getInstance({
        initialValues: {
          name: '',
          email: '',
          country: '',
        },
      });

      subscribeOnce(instance.errors).then((errors) => {
        const errorValues = nonEmpty(Object.values(errors));
        expect(errorValues.length).toBe(0);
      });

      instance
        .validateField('email')
        .then(() => subscribeOnce(instance.errors))
        .then((errors) => nonEmpty(Object.values(errors)))
        .then((errors) => expect(errors.length).toBe(1))
        .then(done);
    });
  });
  describe('updateValidateField', () => {
    it('update and validate a single field', (done) => {
      instance = getInstance({
        initialValues: {
          name: '',
          email: '',
          country: '',
        },
      });

      instance.errors.set({name: 'name is required'});

      subscribeOnce(instance.errors).then((errors) => {
        const errorValues = nonEmpty(Object.values(errors));
        expect(errorValues.length).toBe(1);
      });

      instance
        .updateValidateField('name', 'name')
        .then(() => subscribeOnce(instance.errors))
        .then((errors) => nonEmpty(Object.values(errors)))
        .then((errors) => expect(errors.length).toBe(0))
        .then(done);
    });
  });
});
