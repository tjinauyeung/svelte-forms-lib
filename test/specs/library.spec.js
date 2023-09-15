/* globals beforeEach, console, describe, expect, it, require, jest */
const yup = require('yup');
const Chance = require('chance');

const {createForm} = require('../../lib');

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

      it('ignores properties in initialValues not defined in schema', async () => {
        const initialValues = {notInSchema: ''};
        const validationSchema = yup
          .object()
          .shape({foo: yup.string().required()});
        const instance = getInstance({initialValues, validationSchema});
        const $errors = await subscribeOnce(instance.errors);

        expect($errors.notInSchema).toBeUndefined();
      });

      it('preserves number of initial values for array of fields', async () => {
        const initialValues = {xs: [{name: 'foo'}, {name: 'bar'}]};
        const validationSchema = yup.object().shape({
          xs: yup
            .array()
            .of(yup.object().shape({name: yup.string().required()})),
        });
        const instance = getInstance({initialValues, validationSchema});
        const $errors = await subscribeOnce(instance.errors);
        const $form = await subscribeOnce(instance.form);

        expect($errors.xs.length).toEqual($form.xs.length);
      });

      it('contains an empty array when initialValues property is empty', async () => {
        const initialValues = {};
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

      it('contains errors for invalid object', async () => {
        const initialValues = {foo: '', nested: {foo: ''}};
        const requiredError = 'field required';
        const validationSchema = yup.object().shape({
          foo: yup.string().required(requiredError),
          nested: yup
            .object()
            .shape({foo: yup.string().required(requiredError)}),
        });
        const instance = getInstance({initialValues, validationSchema});

        await instance.handleSubmit();

        const $errors = await subscribeOnce(instance.errors);

        expect($errors.foo).toBe(requiredError);
        expect($errors.nested.foo).toBe(requiredError);
      });

      it('generates error as string for invalid array', async () => {
        const initialValues = {xs: []};
        const minError = 'min error';
        const validationSchema = yup
          .object()
          .shape({xs: yup.array().of(yup.string()).min(1, minError)});
        const instance = getInstance({initialValues, validationSchema});

        await instance.handleSubmit();

        const $errors = await subscribeOnce(instance.errors);

        expect($errors.xs).toBe(minError);
      });

      it('generates arrays of errors when invalid items in arrays', async () => {
        const validValue = 'valid';
        const invalidValue = {invalid: ''};
        const initialValues = {
          // non-primitive values
          xs: [{foo: validValue}, {foo: invalidValue}],
          // primitive values
          ys: [validValue, invalidValue],
        };
        const typeError = 'type error';
        const validationSchema = yup.object().shape({
          xs: yup
            .array()
            .of(yup.object().shape({foo: yup.string().typeError(typeError)})),
          ys: yup.array().of(yup.string().typeError(typeError)),
        });
        const instance = getInstance({initialValues, validationSchema});

        await instance.handleSubmit();

        const $errors = await subscribeOnce(instance.errors);

        expect($errors.xs.length).toBe(initialValues.xs.length);
        expect($errors.xs[0].foo).toBe('');
        expect($errors.xs[1].foo).toBe(typeError);
        expect($errors.ys[0]).toBe('');
        expect($errors.ys[1]).toBe(typeError);
      });

      it('handles null guard when schema is nested', async () => {
        const initialValues = {};
        const barRequired = 'bar';
        const validationSchema = yup.object().shape({
          foo: yup.string().required(),
          nested: yup
            .object()
            .shape({
              foo: yup
                .object()
                .shape({bar: yup.string().required(barRequired)}),
            }),
        });

        const instance = getInstance({initialValues, validationSchema});
        await instance.handleSubmit();
        const $errors = await subscribeOnce(instance.errors);

        expect($errors.nested.foo.bar).toBe(barRequired);
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

      instance.handleChange(nameEvent);
      $modified = await subscribeOnce(instance.modified);

      expect($modified.name).toBe(true);
      expect($modified.address).toBe(false);
      expect($modified.xs).toBe(false);

      instance.handleChange(streetEvent);
      $modified = await subscribeOnce(instance.modified);

      expect($modified.name).toBe(true);
      expect($modified.address).toBe(true);
      expect($modified.xs).toBe(false);

      instance.handleChange(xEvent);
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

    it('is false for invalid arrays', async (done) => {
      const validationSchema = yup
        .array()
        .of(yup.object().shape({x: yup.string().required()}).required());
      const initialValues = [{x: ''}];
      const formInstance = getInstance({validationSchema, initialValues});

      formInstance
        .handleSubmit()
        .then(() => subscribeOnce(formInstance.isValid))
        .then((isValid) => expect(isValid).toBe(false))
        .then(done);
    });

    it('is true for valid arrays', async (done) => {
      const validationSchema = yup
        .array()
        .of(yup.object().shape({x: yup.string().required()}).required());
      const initialValues = [{x: 'foo'}];
      const formInstance = getInstance({validationSchema, initialValues});

      formInstance
        .handleSubmit()
        .then(() => subscribeOnce(formInstance.isValid))
        .then((isValid) => expect(isValid).toBe(true))
        .then(done);
    });

    it('is false for invalid nested arrays', async (done) => {
      const validationSchema = yup.object().shape({
        xs: yup
          .array()
          .of(yup.object().shape({x: yup.string().required()}).required()),
      });
      const initialValues = {xs: [{x: ''}]};
      const formInstance = getInstance({validationSchema, initialValues});

      formInstance
        .handleSubmit()
        .then(() => subscribeOnce(formInstance.isValid))
        .then((isValid) => expect(isValid).toBe(false))
        .then(done);
    });

    it('is true for valid nested arrays', async (done) => {
      const validationSchema = yup.object().shape({
        xs: yup
          .array()
          .of(yup.object().shape({x: yup.string().required()}).required()),
      });
      const initialValues = {xs: [{x: 'bar'}]};
      const formInstance = getInstance({validationSchema, initialValues});

      formInstance
        .handleSubmit()
        .then(() => subscribeOnce(formInstance.isValid))
        .then((isValid) => expect(isValid).toBe(true))
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
          getAttribute: () => 'checkbox',
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
        validate: () => {},
        onSubmit: (values) => console.log(values),
      });

      instance
        .handleChange(event)
        .then(() => subscribeOnce(instance.errors))
        .then((errors) => expect(errors.email).toBe(''))
        .then(done);
    });
  });

  it('validateFn handles nested values on submit', (done) => {
    const errorMessage = 'this field is invalid';
    const instance = createForm({
      initialValues: {
        nested: {
          foo: '',
        },
      },
      validate: (values) => {
        let errs = {
          nested: {},
        };
        if (values.nested.foo === '') {
          errs.nested.foo = errorMessage;
        }
        return errs;
      },
      onSubmit: (values) => console.log(values),
    });

    instance
      .handleSubmit()
      .then(() => subscribeOnce(instance.errors))
      .then((errors) => expect(errors.nested.foo).toBe(errorMessage))
      .then(done);
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

      instance.form.set({
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

    it('propagates error from onSubmit', async () => {
      const error = new Error();
      instance = getInstance({
        onSubmit: () => {
          throw error;
        },
      });

      await expect(() => {
        return instance.handleSubmit();
      }).rejects.toThrow(error);
    });

    it('returns a promise that only resolves when onSubmit resolves - without validation', async () => {
      // Test case created for reproducing a bug where the onSubmit function
      // would not get "waited" for when calling handleSubmit manually due to a
      // missing return statement in handleSubmit.
      const values = [];

      const {handleSubmit} = createForm({
        onSubmit: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          values.push(1);
        },
      });

      const myOtherHandler = async () => {
        await handleSubmit();
        values.push(2);
      };

      await myOtherHandler();

      // This test case failed before fixing the bug, See top of this test case.
      expect(values).toEqual([1, 2]);
    });

    it('returns a promise that only resolves when onSubmit resolves - with validation', async () => {
      // See test case above.
      const values = [];

      const {handleSubmit} = createForm({
        validate: () => true, // Dummy validation just to make sure that code path is taken.
        onSubmit: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          values.push(1);
        },
      });

      const myOtherHandler = async () => {
        await handleSubmit();
        values.push(2);
      };

      await myOtherHandler();

      expect(values).toEqual([1, 2]);
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

  describe('validateForm', () => {
    it('validates form when validationSchema is provided', async (done) => {
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
        .validateForm()
        .then(() => subscribeOnce(instance.errors))
        .then((errors) => nonEmpty(Object.values(errors)))
        .then((errors) => expect(errors.length).toBe(3));

      instance.form.set({
        name: chance.name(),
        email: '',
        country: '',
      });

      instance
        .validateForm()
        .then(() => subscribeOnce(instance.errors))
        .then((errors) => nonEmpty(Object.values(errors)))
        .then((errors) => expect(errors.length).toBe(2))
        .then(done);
    });

    it('returns errors', async (done) => {
      instance = getInstance({
        initialValues: {
          name: '',
          email: '',
          country: '',
        },
      });

      await instance
        .validateForm()
        .then((errors) => expect(Object.values(errors).length).toBe(3))
        .then(done);
    });

    it('validates given a validate function', async (done) => {
      const errorMessage = 'this field is invalid';

      const instance = createForm({
        initialValues: {
          nested: {
            foo: '',
          },
        },
        validate: (values) => {
          let errs = {
            nested: {},
          };
          if (values.nested.foo === '') {
            errs.nested.foo = errorMessage;
          }
          return errs;
        },
      });

      instance
        .validateForm()
        .then((errors) => expect(errors.nested.foo).toBe(errorMessage))
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
          then: () => yup.string().required(),
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
          .oneOf([yup.ref('password'), undefined], "Passwords don't match!"),
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
