import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redis = new Redis({
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD') || undefined,
          db: configService.get('REDIS_DB', 0),
          retryStrategy: (times) => {
            if (times > 3) return null;
            return Math.min(times * 200, 200);
          },
        });
        redis.on('connect', () => {
          console.log('Redis connected');
        });
        redis.on('error', (err) => {
          console.error('Redis error:', err);
        });
        return redis;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
