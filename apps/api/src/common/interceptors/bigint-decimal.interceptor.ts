import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Prisma } from '@ti-erp/database';

// Global prototype fallback for any direct JSON.stringify calls
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

export function serializeBigIntAndDecimal(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  if (obj instanceof Prisma.Decimal) {
    return obj.toNumber();
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeBigIntAndDecimal);
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const transformed: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      transformed[key] = serializeBigIntAndDecimal(obj[key]);
    }
    return transformed;
  }
  return obj;
}

@Injectable()
export class BigIntDecimalInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => serializeBigIntAndDecimal(data)));
  }
}
