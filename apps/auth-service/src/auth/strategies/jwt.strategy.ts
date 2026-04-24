import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import type { JwtPayload } from '@app/contracts';
import { AuthorizedUser } from '@app/common/types/authenticated-request';
import { JWT_SECRET } from '@app/common/constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthorizedUser> {
    try {
      const user = await this.authService.validateUser(payload);
      return user;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
