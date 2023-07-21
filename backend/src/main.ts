import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import axios from 'axios';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  axios.defaults.baseURL = 'http://localhost:3000';
  axios.defaults.proxy = false;
  app.enableCors();
  await app.listen(3000);

}
bootstrap();
