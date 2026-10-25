import type { Type } from "arktype";
import { useState } from "react";

interface UseFormOptions<T extends Record<string, unknown>> {
  schema: Type<T>;
  defaultValues?: Partial<T>;
  validate?: (values: Partial<T>) => Record<string, string> | undefined;
}

interface FieldProps {
  name: string;
  error?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
}

export function useForm<T extends Record<string, unknown>>({
  schema,
  defaultValues = {},
  validate,
}: UseFormOptions<T>) {
  const [values, setValues] = useState<Partial<T>>(defaultValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = (name: string, value: unknown) => {
    const newValues = { ...values, [name]: value };

    // Run custom validation
    if (validate) {
      const validationErrors = validate(newValues);
      if (validationErrors) {
        setErrors((prev) => ({ ...prev, ...validationErrors }));
      } else {
        setErrors({});
      }
    }
  };

  const setValue = (name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (touched[name]) {
      validateField(name, value);
    }
  };

  const field = (name: string): FieldProps => ({
    name,
    error: touched[name] ? errors[name] : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(name, e.target.value);
    },
    onBlur: () => {
      setTouched((prev) => ({ ...prev, [name]: true }));
      validateField(name, values[name]);
    },
  });

  const reset = () => {
    setValues(defaultValues);
    setErrors({});
    setTouched({});
  };

  return {
    values,
    errors,
    touched,
    field,
    setValue,
    setValues,
    reset,
  };
}
