import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV !== 'production') {
      const models = Reflect.ownKeys(this).filter(
        (key) => typeof key === 'string' && !key.startsWith('_') && !key.startsWith('$'),
      );

      return Promise.all(
        models.map((model) => {
          if (this[model as string]?.deleteMany) {
            return this[model as string].deleteMany();
          }
          return Promise.resolve();
        }),
      );
    }
  }
}
