import { PipeTransform, Injectable } from '@nestjs/common';

@Injectable()
export class ParseBooleanPipe implements PipeTransform {
  transform(value: string): boolean | undefined {
    if (value === 'true' || value === 'false') {
      return value === 'true';
    }
    return undefined;
  }
}
