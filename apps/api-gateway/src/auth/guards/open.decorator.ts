import { SetMetadata } from '@nestjs/common';

export const IS_OPEN_KEY = 'isOpen';
export const Open = () => SetMetadata(IS_OPEN_KEY, true);
