import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { createPublicKey } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { ErrorCode, WorkspaceMemberRole } from '@signaldesk/shared';
import { SupabaseJwtPayload } from '../interfaces/jwt-payload.interface';
import { AuthUser } from '../interfaces/auth-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    const jwtSecret = configService.get<string>(
      'SUPABASE_JWT_SECRET',
      'super-secret-jwt-token-with-at-least-32-characters-long',
    );
    const supabaseUrl =
      configService.get<string>('SUPABASE_URL') ||
      configService.get<string>('VITE_SUPABASE_URL') ||
      'http://127.0.0.1:54321';
    const jwks = new SupabaseJwks(supabaseUrl);

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromUrlQueryParameter('token'),
      ]),
      ignoreExpiration: false,
      audience: 'authenticated',
      issuer: new URL('/auth/v1', supabaseUrl).toString(),
      algorithms: ['HS256', 'ES256'],
      secretOrKeyProvider: (_request, rawJwtToken, done) => {
        jwks
          .resolveVerificationKey(rawJwtToken, jwtSecret)
          .then((key) => done(null, key))
          .catch((error) => done(error));
      },
    });
  }

  async validate(payload: SupabaseJwtPayload): Promise<AuthUser> {
    if (!payload.sub) {
      throw new HttpException(
        {
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Invalid token: missing subject claim',
            statusCode: HttpStatus.UNAUTHORIZED,
          },
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!payload.workspace_id) {
      throw new HttpException(
        {
          error: {
            code: ErrorCode.NO_WORKSPACE,
            message: 'Authenticated user does not belong to any workspace',
            statusCode: HttpStatus.FORBIDDEN,
          },
        },
        HttpStatus.FORBIDDEN,
      );
    }

    const rawRole = (payload.workspace_role as string)?.toLowerCase();
    const role =
      rawRole === WorkspaceMemberRole.MANAGER
        ? WorkspaceMemberRole.MANAGER
        : WorkspaceMemberRole.AGENT;

    return {
      userId: payload.sub,
      workspaceId: payload.workspace_id,
      role,
      email: payload.email,
      displayName: payload.display_name || payload.email || 'User',
    };
  }
}

interface SupabaseJwkSet {
  keys: SupabaseJwk[];
}

type SupabaseJwk = import('crypto').JsonWebKey & { kid?: string };

class SupabaseJwks {
  private cachedKeys = new Map<string, string>();

  constructor(private readonly supabaseUrl: string) {}

  async resolveVerificationKey(rawJwtToken: string, hmacSecret: string): Promise<string> {
    const decoded = jwt.decode(rawJwtToken, { complete: true });
    if (!decoded || typeof decoded === 'string') {
      throw new Error('Malformed JWT header');
    }

    if (decoded.header.alg === 'HS256') {
      return hmacSecret;
    }

    const keyId = decoded.header.kid;
    if (!keyId) {
      throw new Error('JWT signing key identifier is missing');
    }

    const cachedKey = this.cachedKeys.get(keyId);
    if (cachedKey) {
      return cachedKey;
    }

    const response = await fetch(
      new URL('/auth/v1/.well-known/jwks.json', this.supabaseUrl),
    );
    if (!response.ok) {
      throw new Error(`Unable to load Supabase JWKS: HTTP ${response.status}`);
    }

    const jwkSet = (await response.json()) as SupabaseJwkSet;
    const jwk = jwkSet.keys.find((candidate) => candidate.kid === keyId);
    if (!jwk) {
      throw new Error(`Supabase JWKS does not contain signing key ${keyId}`);
    }

    const publicKey = createPublicKey({ key: jwk, format: 'jwk' }).export({
      format: 'pem',
      type: 'spki',
    }) as string;
    this.cachedKeys.set(keyId, publicKey);
    return publicKey;
  }
}
