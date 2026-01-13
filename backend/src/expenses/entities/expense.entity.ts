import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Expense {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column('text')
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  date: Date;

  @Column('varchar', { length: 50 })
  category: string;
}
