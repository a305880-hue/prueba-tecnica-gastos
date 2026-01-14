import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config'; // <--- Importante
import { ExpensesModule } from './expenses/expenses.module';

@Module({
  imports: [
    // 1. Cargamos el lector de archivos .env
    ConfigModule.forRoot({
  envFilePath: '.env',
  isGlobal: true,
}),
    
    // 2. Usamos las variables secretas
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'), // Convertimos texto a número
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      autoLoadEntities: true,
      synchronize: true,
      ssl: process.env.DB_SSL === 'true', 
      extra: {
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : null,
      },
    }),
    
    ExpensesModule,
  ],
})
export class AppModule {}