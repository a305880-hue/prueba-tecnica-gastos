import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm'; // Importamos Like para buscar
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { Expense } from './entities/expense.entity';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private expenseRepository: Repository<Expense>,
  ) {}

  create(createExpenseDto: CreateExpenseDto) {
    const newExpense = this.expenseRepository.create({
      ...createExpenseDto,
      date: new Date(),
    });
    return this.expenseRepository.save(newExpense);
  }

  // 1. PAGINACIÓN: Ahora recibe página y límite
  findAll(page: number = 1, limit: number = 10) {
    return this.expenseRepository.find({
      skip: (page - 1) * limit, // Saltar los anteriores
      take: limit,              // Tomar solo la cantidad pedida
      // Ordenar del más reciente al más antiguo.
      // El id desempata cuando dos gastos tienen la misma fecha.
      order: { date: 'DESC', id: 'DESC' }
    });
  }

  // 2. BÚSQUEDA: Nuevo método para buscar por descripción
  search(query: string) {
    return this.expenseRepository.find({
      where: {
        description: Like(`%${query}%`), // Busca coincidencias parciales
      },
      order: { date: 'DESC', id: 'DESC' }
    });
  }

  // 3. SEED: Genera 10 gastos de prueba para llenar la base de datos
  async seed() {
    const ejemplos = [
      { description: 'Tacos de pastor', amount: 120, category: 'Comida' },
      { description: 'Gasolina', amount: 500, category: 'Transporte' },
      { description: 'Cine', amount: 180, category: 'Entretenimiento' },
      { description: 'Farmacia', amount: 250, category: 'Salud' },
      { description: 'Súper semanal', amount: 850, category: 'Comida' },
      { description: 'Uber al centro', amount: 95, category: 'Transporte' },
      { description: 'Suscripción streaming', amount: 219, category: 'Entretenimiento' },
      { description: 'Consulta médica', amount: 600, category: 'Salud' },
      { description: 'Café con amigos', amount: 140, category: 'Comida' },
      { description: 'Papelería', amount: 75, category: 'Otros' },
    ];

    const gastos = ejemplos.map((e) =>
      this.expenseRepository.create({ ...e, date: new Date() }),
    );
    await this.expenseRepository.save(gastos);
    return { message: 'Se crearon 10 gastos de prueba', total: gastos.length };
  }

  findOne(id: number) {
    return this.expenseRepository.findOneBy({ id });
  }

  update(id: number, updateExpenseDto: UpdateExpenseDto) {
    return this.expenseRepository.update(id, updateExpenseDto);
  }

  remove(id: number) {
    return this.expenseRepository.delete(id);
  }
}