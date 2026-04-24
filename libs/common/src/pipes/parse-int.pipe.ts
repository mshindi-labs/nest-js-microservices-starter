import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  ParseIntPipe,
  PipeTransform,
} from '@nestjs/common';

@Injectable()
export class ParseIntegerPipe implements PipeTransform {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  transform(value: string, _metadata: ArgumentMetadata) {
    if (value) {
      const val = parseInt(value, 10);
      if (isNaN(val)) {
        throw new BadRequestException(
          `Validation failed. "${val}" is not an integer.`,
        );
      }
      return val;
    }
    return value;
  }
}

export { ParseIntPipe };
