import { PrismaClient, Prisma } from '@prisma/client';

export * from '@prisma/client';
export { Prisma };
export const Decimal = Prisma.Decimal;
export type Decimal = Prisma.Decimal;

export class DatabaseService extends PrismaClient {
  private static instance: DatabaseService;

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }
}

export const db = DatabaseService.getInstance();
