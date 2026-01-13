import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 1. ESTO CUMPLE EL REQUISITO DE LA RUTA /api/...
  app.setGlobalPrefix('api'); 

  // 2. Habilitar CORS
  app.enableCors(); 
  
  await app.listen(3000);
}
bootstrap();
