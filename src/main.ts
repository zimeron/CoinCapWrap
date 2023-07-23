import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import axios from 'axios';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  axios.defaults.baseURL = 'http://localhost:3000';
  axios.defaults.proxy = false;

  const config = new DocumentBuilder()
    .setTitle('Expert Institute Code Assessment')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/', app, document);

  app.enableCors();
  await app.listen(3000);

}
bootstrap();
