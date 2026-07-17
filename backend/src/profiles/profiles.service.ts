import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { Expense } from '../expenses/entities/expense.entity';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @InjectRepository(Expense)
    private expenseRepository: Repository<Expense>,
  ) {}

  // Lista los perfiles registrados + los que ya tienen gastos
  // (por si existen gastos de antes de que hubiera tabla de perfiles)
  async findAll() {
    const registrados = await this.profileRepository.find({
      order: { name: 'ASC' },
    });
    const conGastos = await this.expenseRepository
      .createQueryBuilder('expense')
      .select('DISTINCT expense.profile', 'profile')
      .getRawMany();

    const nombres = new Set<string>([
      ...registrados.map((p) => p.name),
      ...conGastos.map((r) => r.profile),
    ]);
    return [...nombres].sort((a, b) => a.localeCompare(b));
  }

  // Crea el perfil si no existe. Si ya existe, lo regresa sin error,
  // así el mismo perfil se puede usar desde varios dispositivos.
  async create(name: string) {
    const clean = (name || '').trim();
    if (!clean) {
      throw new BadRequestException('El nombre del perfil no puede estar vacío');
    }
    if (clean.length > 50) {
      throw new BadRequestException('El nombre del perfil es demasiado largo (máximo 50 letras)');
    }

    const existente = await this.profileRepository.findOneBy({ name: clean });
    if (existente) return existente;

    const nuevo = this.profileRepository.create({ name: clean });
    return this.profileRepository.save(nuevo);
  }
}
