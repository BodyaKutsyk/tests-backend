import { ValidationError } from 'class-validator';

export function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const error of errors) {
    const property = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    if (error.constraints) {
      result[property] = Object.values(error.constraints);
    }

    if (error.children?.length) {
      Object.assign(result, flattenValidationErrors(error.children, property));
    }
  }

  return result;
}
