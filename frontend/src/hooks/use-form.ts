import { useState } from 'react';
import { ValidationError, type AnyObjectSchema } from 'yup';
import { announceProblems } from '@/lib/announce';

type Errors<T> = Partial<Record<keyof T, string>>;

// Field errors for values kept anywhere, such as the studio's words
export function useFieldErrors<T extends object>(schema: AnyObjectSchema) {
  const [errors, setErrors] = useState<Errors<T>>({});

  const check = (name: keyof T, values: T) => {
    try {
      schema.validateSyncAt(name as string, values);
      setErrors((current) => ({ ...current, [name]: undefined }));
    } catch (error) {
      setErrors((current) => ({ ...current, [name]: (error as ValidationError).message }));
    }
  };

  return {
    errors,
    check,
    // A field showing an error is checked as it's typed in, so the error goes once it's fixed
    recheck: (values: T) => {
      for (const name of Object.keys(errors) as (keyof T)[]) {
        if (errors[name]) {
          check(name, values);
        }
      }
    },
    validate: (values: T): boolean => {
      try {
        schema.validateSync(values, { abortEarly: false });
        setErrors({});
        return true;
      } catch (error) {
        const found: Errors<T> = {};
        for (const inner of (error as ValidationError).inner) {
          found[inner.path as keyof T] ??= inner.message;
        }
        setErrors(found);
        announceProblems(Object.values(found));
        return false;
      }
    },
  };
}

export function useForm<T extends Record<string, string>>(schema: AnyObjectSchema, initial: T) {
  const [values, setValues] = useState<T>(initial);
  const { errors, check, recheck, validate } = useFieldErrors<T>(schema);

  const change = (name: keyof T, text: string) => {
    const next = { ...values, [name]: text };
    setValues(next);
    recheck(next);
  };

  return {
    values,
    errors,
    setValue: change,
    field: (name: keyof T) => ({
      value: values[name],
      onChangeText: (text: string) => change(name, text),
      onBlur: () => check(name, values),
      error: errors[name],
    }),
    validate: () => validate(values),
  };
}
