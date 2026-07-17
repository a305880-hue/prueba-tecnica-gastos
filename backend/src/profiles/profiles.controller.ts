import { Body, Controller, Get, Post } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  // Lista de perfiles disponibles
  // Ruta: GET /api/profiles
  @Get()
  findAll() {
    return this.profilesService.findAll();
  }

  // Registra un perfil nuevo (o regresa el existente si ya estaba)
  // Ruta: POST /api/profiles  { "name": "Sebastian" }
  @Post()
  create(@Body() createProfileDto: CreateProfileDto) {
    return this.profilesService.create(createProfileDto.name);
  }
}
