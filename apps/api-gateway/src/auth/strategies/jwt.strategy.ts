import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload } from '@app/contracts';
import type { AuthorizedUser } from '@app/common/types/authenticated-request';
import { JWT_SECRET } from '@app/common/constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_SECRET,
    });
  }

  validate(payload: JwtPayload): AuthorizedUser {
    if (!payload.sub || !payload.accountId) {
      throw new UnauthorizedException('Invalid token');
    }

    return {
      userId: payload.sub,
      accountId: payload.accountId,
      name: payload.name,
      roleId: payload.roleId,
      roleName: payload.roleName,
      organizationId: payload.organizationId,
      email: payload.email,
      msisdn: payload.msisdn,
    };
  }
}
