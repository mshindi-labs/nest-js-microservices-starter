import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import type { AuthResponseDto } from '../dto/auth-response.dto';
import { AUTH_PATTERNS, AUTH_SERVICE } from '@app/contracts';
import type { GoogleCallbackPayload } from '@app/contracts';
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL,
} from '@app/common/constants';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(@Inject(AUTH_SERVICE) private readonly authClient: ClientProxy) {
    super({
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const { id: googleId, emails, displayName, photos } = profile;
    const email = emails?.[0]?.value;
    const avatar = photos?.[0]?.value;

    const payload: GoogleCallbackPayload = {
      googleId,
      email,
      name: displayName,
      avatar,
    };

    const result = await firstValueFrom<AuthResponseDto>(
      this.authClient.send(AUTH_PATTERNS.GOOGLE_CALLBACK, payload),
    );

    done(null, result);
  }
}
