import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { BigIntDecimalInterceptor } from './common/interceptors/bigint-decimal.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Enable Cross-Origin Resource Sharing for pos-web & cloud-admin
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 2. Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  // 3. Global BigInt & Decimal Serialization Interceptor
  app.useGlobalInterceptors(new BigIntDecimalInterceptor());

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`TI-ERP API operational on port ${port} (Role: ${process.env.STORE_ROLE || 'LOCAL_STORE'})`);
}

bootstrap();
