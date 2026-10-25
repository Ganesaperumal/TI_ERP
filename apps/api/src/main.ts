import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`TI-ERP API operational on port ${port} (Role: ${process.env.STORE_ROLE || 'LOCAL_STORE'})`);
}

bootstrap();
