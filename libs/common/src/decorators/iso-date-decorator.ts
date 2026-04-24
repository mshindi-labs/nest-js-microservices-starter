/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsIsoDateConstraint implements ValidatorConstraintInterface {
  validate(date: unknown, _args: ValidationArguments) {
    if (typeof date !== 'string') return false;
    const isoDateRegex =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
    return isoDateRegex.test(date);
  }

  defaultMessage(_args: ValidationArguments) {
    return 'Date ($value) must be in ISO 8601 format';
  }
}

export function IsIsoDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsIsoDateConstraint,
    });
  };
}
