import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Profile } from './entities/profile.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { ProfilesService } from './profiles.service';
import { ProfilesController } from './profiles.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Profile, Expense])],
  controllers: [ProfilesController],
  providers: [ProfilesService],
})
export class ProfilesModule {}
