import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

import { isValidDateString } from '../utils';

@Injectable()
export class ParseDatePipe implements PipeTransform {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  transform(value: string, _metadata: ArgumentMetadata) {
    if (value) {
      if (!isValidDateString(value)) {
        throw new BadRequestException(
          `Validation failed. "${value}" is not a date.`,
        );
      }

      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
      if (isoRegex.test(value)) {
        return value;
      }

      const date = Date.parse(value);
      return new Date(date).toISOString();
    } else {
      return value;
    }
  }
}
