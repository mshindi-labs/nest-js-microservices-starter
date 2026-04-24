import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_OPEN_KEY } from './open.decorator';
import { X_API_KEY } from '@app/common/constants/auth-constants';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isOpen = this.reflector.getAllAndOverride<boolean>(IS_OPEN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isOpen) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const authHeader: string | undefined = request.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      return true;
    }

    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('Missing Valid API key');
    }

    if (apiKey !== X_API_KEY) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
