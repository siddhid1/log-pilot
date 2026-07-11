import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';

export const DRIZZLE_DB = 'DRIZZLE_DB';

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_DB,
      useFactory: () => {
        const connectionString = process.env.DATABASE_URL;

        if (!connectionString) {
          throw new Error('DATABASE_URL environment variable is not set');
        }
        const pool = new Pool({ connectionString });
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DRIZZLE_DB],
})
export class DatabaseModule {}
