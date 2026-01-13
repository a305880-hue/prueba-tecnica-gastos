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
      order: { date: 'DESC' }   // Ordenar del más reciente al más antiguo
    });
  }

  // 2. BÚSQUEDA: Nuevo método para buscar por descripción
  search(query: string) {
    return this.expenseRepository.find({
      where: {
        description: Like(`%${query}%`), // Busca coincidencias parciales
      },
      order: { date: 'DESC' }
    });
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