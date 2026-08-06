import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DRIZZLE_DB } from '../database/database.module';
import * as schema from '../database/schema';
import { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { REDIS_CLIENT } from '../infra/redis.module';
import { Observable } from 'rxjs';
import Redis from 'ioredis';
import { extractKeyId } from '../utils/apiKeyVerifier';
import { digest } from '../utils/keyDigest';
import {
  CachedKey,
  LAST_USED_DEBOUNCE_SEC,
  LAST_USED_HASH,
  LRU_SOFT_TTL_MS,
  REDIS_HARD_TTL,
  VERSION,
} from '../config';
import { LRUCache } from 'lru-cache/raw';
import { and, eq, isNull } from 'drizzle-orm';
import * as argon2 from 'argon2';
import { verifyToken } from '@clerk/backend';

const localCache = new LRUCache<string, CachedKey>({ max: 100_000 });

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(DRIZZLE_DB) private db: NeonHttpDatabase<typeof schema>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  private async trackApiKeyLastUsed(keyId: string) {
    const lockKey = `oml:api_key:last_used_lock:${VERSION}:${keyId}`;

    const ok = await this.redis.set(
      lockKey,
      '1',
      'EX',
      LAST_USED_DEBOUNCE_SEC,
      'NX',
    );
    if (!ok) return;

    await this.redis.hset(LAST_USED_HASH, keyId, Date.now().toString());
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    if (apiKey) {
      const keyId = extractKeyId(apiKey);
      if (!keyId) {
        throw new UnauthorizedException('Invalid API key');
      }
      const d = digest(apiKey);
      const lruKey = `${VERSION}:${keyId}`;
      const now = Date.now();

      try {
        const c = localCache.get(lruKey);
        if (c && c.expiresAt > now && c.apiKeyDigest === d) {
          request.user = {
            id: c.userId,
            keyId,
          };
          void this.trackApiKeyLastUsed(keyId);
          return true;
        }
        const rKeyDigest = `oml:api_key:${VERSION}:${keyId}`;
        const rDigest = await this.redis.hgetall(rKeyDigest);
        if (rDigest?.invalid === '1') {
          throw new UnauthorizedException('Unauthorized');
        }
        if (rDigest?.apiKeyDigest && rDigest?.apiKeyDigest !== d) {
          throw new UnauthorizedException('Unauthorized');
        }
        if (rDigest?.user_id) {
          localCache.set(lruKey, {
            userId: rDigest.user_id,
            apiKeyDigest: d,
            expiresAt: now + LRU_SOFT_TTL_MS,
          });

          request.user = {
            id: rDigest.user_id,
            keyId,
          };
          void this.trackApiKeyLastUsed(keyId);
          return true;
        }
        const record = await this.db.query.api_key.findFirst({
          where: (ak) => and(eq(ak.id, keyId), isNull(ak.revoked_at)),
          columns: {
            value: true,
            user_id: true,
            revoked_at: true,
          },
        });
        if (!record) {
          throw new UnauthorizedException('Unauthorized!');
        }
        const isValid = await argon2.verify(record.value, apiKey);
        if (!isValid) {
          await this.redis.hset(rKeyDigest, {
            invalid: '1',
          });
          await this.redis.expire(rKeyDigest, REDIS_HARD_TTL);
          throw new UnauthorizedException('Unauthorized!');
        }
        await this.redis.hset(rKeyDigest, {
          user_id: record.user_id,
          apiKeyDigest: d,
        });
        await this.redis.expire(rKeyDigest, REDIS_HARD_TTL);
        request.user = {
          id: record.user_id,
          keyId,
        };
        void this.trackApiKeyLastUsed(keyId);
        return true;
      } catch (error) {
        console.error('Authorization error:', error);
        throw new UnauthorizedException('Unauthorized!');
      }
    }

    const token = request.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }
    try {
      const verifiedToken = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      });
      request.user = {
        id: verifiedToken.sub,
        ...verifiedToken,
      };
      return true;
    } catch (error) {
      throw new UnauthorizedException(
        'something went wrong! please use our SDK',
      );
    }
  }
}
