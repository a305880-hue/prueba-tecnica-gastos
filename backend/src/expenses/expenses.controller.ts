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
  // Ruta: GET /api/expenses/search?query=tacos&profile=Sebastian
  @Get('search')
  search(@Query('query') query: string, @Query('profile') profile?: string) {
    return this.expensesService.search(query, profile);
  }

  // Genera 10 gastos de prueba automáticos
  // Ruta: GET /api/expenses/seed?profile=Sebastian
  @Get('seed')
  seed(@Query('profile') profile?: string) {
    return this.expensesService.seed(profile);
  }

  // Suma de TODOS los gastos del perfil (no solo la página visible)
  // Ruta: GET /api/expenses/total?profile=Sebastian
  @Get('total')
  total(@Query('profile') profile?: string) {
    return this.expensesService.total(profile);
  }

  // Lista de perfiles que ya tienen gastos guardados
  // Ruta: GET /api/expenses/profiles
  @Get('profiles')
  profiles() {
    return this.expensesService.profiles();
  }

  // REQUISITO: Endpoint de Listado con Paginación
  // Ruta: GET /api/expenses?page=1&limit=10&profile=Sebastian
  @Get()
  findAll(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('profile') profile?: string,
  ) {
    // Si no mandan nada, usamos valores por defecto (Página 1, 10 registros)
    return this.expensesService.findAll(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      profile,
    );
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