import { Global, Module, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { Database } from './types';

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      useFactory: (configService: ConfigService) => {
        const connectionString = configService.get<string>(
          'DATABASE_URL',
          'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
        );

        const pool = new Pool({
          connectionString,
        });

        const dialect = new PostgresDialect({
          pool,
        });

        return new Kysely<Database>({
          dialect,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Kysely<Database>,
  ) {}

  async onModuleDestroy() {
    await this.db.destroy();
  }
}
