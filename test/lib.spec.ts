import Chance from "chance";
import * as yup from "yup";
import { Schema } from "yup";
import makeForm from "../src";

const chance = new Chance();

describe("form", () => {
  let instance;
  let form;
  let validationSchema: Schema<{}>;

  beforeEach(() => {
    form = {
      name: "foo" || chance.name(),
      email: "foo@bar" || chance.email(),
      country: "nl" || chance.country()
    };
    validationSchema = yup.object().shape({
      name: yup.string().required(),
      email: yup.number().required(),
      country: yup.string().required()
    });
    instance = makeForm({ form, validationSchema });
  });

  afterEach(() => instance.unsubscribe());

  describe("form", () => {
    it("registers the form and returns it as observable", () => {
      const unsubscribe = instance.form.subscribe(values => {
        expect(values.name).toBe(form.name);
        expect(values.email).toBe(form.email);
        expect(values.country).toBe(form.country);
      });
      unsubscribe();
    });
  });

  describe("handleChange", () => {
    it("registers the change in the form state", () => {
      const event = {
        target: {
          name: "name",
          value: chance.name()
        }
      };
      instance.handleChange(event);
      const unsubscribe = instance.form.subscribe(values => {
        console.log({ values });
        expect(values.name).toBe(event.target.value);
      });
      unsubscribe();

      const unsub = instance.form.subscribe(values => {
        console.log({ values });
        expect(values.name).toBe(event.target.value);
      });
      unsub();
    });

    it("validates change if schema is provided", () => {
      instance.handleChange({
        target: {
          name: "email",
          value: ""
        }
      });
      const unsubscribe = instance.errors.subscribe(errs => {
        expect(Object.values(errs).length).toBeGreaterThan(0);
      });
      unsubscribe();
    });
  });

  describe("handleSubmit", () => {
    it("validates change if schema is provided", () => {
      instance.handleSubmit({
        preventDefault: () => {}
      });
      const unsubscribe = instance.errors.subscribe(errs => {
        expect(Object.values(errs).length).toBeGreaterThan(0);
      });
      unsubscribe();
    });
  });
});
