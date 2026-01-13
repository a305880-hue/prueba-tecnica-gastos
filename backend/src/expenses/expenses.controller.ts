import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  create(@Body() createExpenseDto: CreateExpenseDto) {
    return this.expensesService.create(createExpenseDto);
  }

  // REQUISITO: Endpoint de Búsqueda 
  // Ruta: GET /api/expenses/search?query=tacos
  @Get('search')
  search(@Query('query') query: string) {
    return this.expensesService.search(query);
  }

  // REQUISITO: Endpoint de Listado con Paginación
  // Ruta: GET /api/expenses?page=1&limit=10
  @Get()
  findAll(@Query('page') page: number, @Query('limit') limit: number) {
    // Si no mandan nada, usamos valores por defecto (Página 1, 10 registros)
    return this.expensesService.findAll(page ? Number(page) : 1, limit ? Number(limit) : 10);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.expensesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateExpenseDto: UpdateExpenseDto) {
    return this.expensesService.update(+id, updateExpenseDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.expensesService.remove(+id);
  }
}