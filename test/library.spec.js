/* globals beforeEach, console, describe, expect, it, require, jest */
const {createForm} = require('../lib');
const yup = require('yup');
const Chance = require('chance');

const chance = new Chance();

function nonEmpty(array) {
  return array.filter((string) => string !== '');
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
    it('does not throw when no initialValues provided', () => {
      const initialValues = undefined;
      const config = {initialValues};

      expect(() => createForm(config)).not.toThrow();
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

    describe('using validationSchema', () => {
      it('initialises primitive properties to empty strings', async () => {
        const initialValues = {foo: 'bar', baz: 'quux', nested: {foo: 'bar'}};
        const validationSchema = yup.object().shape({
          foo: yup.string().required(),
          baz: yup.string().required(),
          nested: yup.object().shape({foo: yup.string().required()}),
        });
        const instance = getInstance({initialValues, validationSchema});
        const $errors = await subscribeOnce(instance.errors);

        expect($errors.foo).toBe('');
        expect($errors.baz).toBe('');
        expect($errors.nested.foo).toBe('');
      });

      it('does not initialise initialValues not defined in schema', async () => {
        const initialValues = {notInSchema: ''};
        const validationSchema = yup
          .object()
          .shape({foo: yup.string().required()});
        const instance = getInstance({initialValues, validationSchema});
        const $errors = await subscribeOnce(instance.errors);

        expect($errors.notInSchema).toBeUndefined();
      });

      it('contains an empty array when initialValues property is empty', async () => {
        const initialValues = {foo: []};
        const validationSchema = yup.object().shape({
          stringArray: yup.array().of(yup.string().required()),
          objectArray: yup
            .array()
            .of(
              yup
                .object()
                .shape({foo: yup.array().of(yup.string().required())}),
            ),
          nested: yup
            .object()
            .shape({foo: yup.array().of(yup.string().required())}),
        });
        const instance = getInstance({initialValues, validationSchema});
        const $errors = await subscribeOnce(instance.errors);

        expect($errors.stringArray).toEqual([]);
        expect($errors.objectArray).toEqual([]);
        expect($errors.nested.foo).toEqual([]);
      });

      it('preserves number of initial values for array properties', async () => {
        const initialValues = {foo: [{name: 'foo'}, {name: 'bar'}]};
        const validationSchema = yup.object().shape({
          foo: yup
            .array()
            .of(yup.object().shape({name: yup.string().required()})),
        });
        const instance = getInstance({initialValues, validationSchema});
        const $errors = await subscribeOnce(instance.errors);
        const $form = await subscribeOnce(instance.form);

        expect($errors.foo.length).toEqual($form.foo.length);
      });
    });
  });

  describe('$touched', () => {
    it('returns an observable with a subscribe method', () => {
      expect(instance.errors.subscribe).toBeDefined();
    });

    it('contains the current values which are accessed by subscription', (done) => {
      subscribeOnce(instance.touched).then((touched) => {
        expect(touched.name).toBe(false);
        expect(touched.email).toBe(false);
        expect(touched.country).toBe(false);

        done();
      });
    });
  });

  describe('$modified', () => {
    it('returns an observable with a subscribe method', () => {
      expect(instance.modified.subscribe).toBeDefined();
    });

    it('is false for initialized values', async () => {
      const instance = getInstance({
        initialValues: {
          name: '',
          address: {street: '', city: '', country: ''},
          xs: [{foo: 'bar'}],
        },
      });
      const $modified = await subscribeOnce(instance.modified);

      expect($modified.name).toBe(false);
      expect($modified.address).toBe(false);
      expect($modified.xs).toBe(false);
    });

    it('sets changed values to true', async () => {
      const name = 'foo';
      const street = 'bar';
      const xFoo = 'baz';
      const nameEvent = {target: {name: 'name', value: name}};
      const streetEvent = {target: {name: 'address.street', value: street}};
      const xEvent = {target: {name: 'xs[0].foo', value: xFoo}};
      const instance = getInstance({
        initialValues: {
          name: '',
          address: {street: '', city: '', country: ''},
          xs: [{foo: 'bar'}],
        },
        validationSchema: yup.object().shape({
          name: yup.string(),
          address: yup.object().shape({
            street: yup.string(),
            city: yup.string(),
            country: yup.string(),
          }),
          xs: yup.array().of(
            yup.object().shape({
              foo: yup.string(),
            }),
          ),
        }),
      });
      let $modified;

      await instance.handleChange(nameEvent);
      const $form = await subscribeOnce(instance.form);
      $modified = await subscribeOnce(instance.modified);

      expect($modified.name).toBe(true);
      expect($modified.address).toBe(false);
      expect($modified.xs).toBe(false);

      await instance.handleChange(streetEvent);
      $modified = await subscribeOnce(instance.modified);

      expect($modified.name).toBe(true);
      expect($modified.address).toBe(true);
      expect($modified.xs).toBe(false);

      await instance.handleChange(xEvent);
      $modified = await subscribeOnce(instance.modified);

      expect($modified.name).toBe(true);
      expect($modified.address).toBe(true);
      expect($modified.xs).toBe(true);
    });
  });

  describe('$isValid', () => {
    it('returns an observable with a subscribe method', () => {
      expect(instance.isValid.subscribe).toBeDefined();
    });

    it('returns true if form is valid', async (done) => {
      instance
        .handleSubmit()
        .then(() => subscribeOnce(instance.isValid))
        .then((isValid) => {
          expect(isValid).toBe(true);
        })
        .then(done);
    });

    it('returns false if form is invalid', async (done) => {
      await instance.form.set({
        name: '',
        email: '',
        country: '',
      });

      instance
        .handleSubmit()
        .then(() => subscribeOnce(instance.isValid))
        .then((isValid) => {
          expect(isValid).toBe(false);
        })
        .then(done);
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
    it('updates the form when connected to change handler of input', async (done) => {
      const email = chance.email();
      const event = {
        target: {
          name: 'email',
          value: email,
        },
      };

      await new Promise((resolve) => {
        subscribeOnce(instance.form).then((form) => {
          expect(form.email).toBe(initialValues.email);

          resolve();
        });
      });

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
        .then((errors) =>
          expect(errors.email).toBe('email must be a valid email'),
        )
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
    it('validates form on submit when validationSchema is provided', async (done) => {
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

      await instance
        .handleSubmit()
        .then(() => subscribeOnce(instance.errors))
        .then((errors) => nonEmpty(Object.values(errors)))
        .then((errors) => expect(errors.length).toBe(3));

      await instance.form.set({
        name: chance.name(),
        email: '',
        country: '',
      });

      instance
        .handleSubmit()
        .then(() => subscribeOnce(instance.errors))
        .then((errors) => nonEmpty(Object.values(errors)))
        .then((errors) => expect(errors.length).toBe(2))
        .then(done);
    });

    it('calls onSubmit when form is valid', (done) => {
      instance = getInstance();
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

  describe('when a validation depends on another field: using when', () => {
    beforeEach(() => {
      validationSchema = yup.object().shape({
        wantsSomething: yup.boolean(),
        what: yup.string().when('wantsSomething', {
          is: true,
          then: yup.string().required(),
        }),
      });
    });

    it('when a is true, b is required', (done) => {
      instance = getInstance({
        initialValues: {
          wantsSomething: true,
        },
      });

      subscribeOnce(instance.errors).then((errors) => {
        const errorValues = nonEmpty(Object.values(errors));
        expect(errorValues.length).toBe(0);
      });

      instance
        .handleSubmit()
        .then(() => subscribeOnce(instance.errors))
        .then((errors) => {
          const errorValues = nonEmpty(Object.values(errors));
          expect(errorValues.length).toBe(1);
          expect(errors.what).toBe('what is a required field');
        })
        .then(done);
    });
    it('when a is false, b is not required', (done) => {
      instance = getInstance({
        initialValues: {
          wantsSomething: false,
        },
      });

      subscribeOnce(instance.errors).then((errors) => {
        const errorValues = nonEmpty(Object.values(errors));
        expect(errorValues.length).toBe(0);
      });

      instance
        .handleSubmit()
        .then(() => subscribeOnce(instance.errors))
        .then((errors) => {
          const errorValues = nonEmpty(Object.values(errors));
          expect(errorValues.length).toBe(0);
        })
        .then(done);
    });
  });

  describe('when a validation depends on another field: using ref', () => {
    beforeEach(() => {
      validationSchema = yup.object().shape({
        password: yup.string().required(),
        passwordConfirmation: yup
          .string()
          .oneOf([yup.ref('password'), null], "Passwords don't match!"),
      });
    });

    it("is invalid when passwords don't match", (done) => {
      instance = getInstance({
        initialValues: {
          password: 'a',
          passwordConfirmation: 'b',
        },
      });

      subscribeOnce(instance.errors).then((errors) => {
        const errorValues = nonEmpty(Object.values(errors));
        expect(errorValues.length).toBe(0);
      });

      instance
        .handleSubmit()
        .then(() => subscribeOnce(instance.errors))
        .then((errors) => {
          const errorValues = nonEmpty(Object.values(errors));
          expect(errorValues.length).toBe(1);
          expect(errors.passwordConfirmation).toBe("Passwords don't match!");
        })
        .then(done);
    });

    it('is valid when passwords match', (done) => {
      instance = getInstance({
        initialValues: {
          password: 'a',
          passwordConfirmation: 'a',
        },
      });

      subscribeOnce(instance.errors).then((errors) => {
        const errorValues = nonEmpty(Object.values(errors));
        expect(errorValues.length).toBe(0);
      });

      instance
        .handleSubmit()
        .then(() => subscribeOnce(instance.errors))
        .then((errors) => {
          const errorValues = nonEmpty(Object.values(errors));
          expect(errorValues.length).toBe(0);
        })
        .then(done);
    });
  });
});
