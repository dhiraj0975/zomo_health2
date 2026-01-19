import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
import { MonthlyBasis, RecurringPatternType } from '../../enum';
@Entity({ name: tableConstant.COMPANIES.TBL_C_CENSUS_FREQUENCY })
export class CensusFrequencyEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', default: 0 })
    organization_id: number;
    @Column({ type: 'enum', enum: RecurringPatternType, nullable: true, default: null })
    recurring_pattern_type: RecurringPatternType;
    @Column({ type: 'varchar', length: 50, nullable: true, default: null })
    weekly_basis_day: string;
    @Column({ type: 'enum', enum: MonthlyBasis, nullable: true, default: null })
    monthly_basis: MonthlyBasis;
    @Column({ type: 'varchar', length: 50, nullable: true, default: null })
    monthly_date_basis: string;
    @Column({ type: 'int', nullable: true, default: null })
    monthly_basis_Type: number;
    @Column({ type: 'varchar', length: 50, nullable: true, default: null })
    monthly_basis_day: string;
    @Column({ type: 'int', nullable: true, default: null })
    year_basis_day: number;
    @Column({ type: 'int', nullable: true, default: null })
    year_basis_month: number;
    @Column({ type: 'int',  default: 0 })
    upload_type: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    user_notify: number;
    @Column({ type: 'int', default: 1 })
    status: number;
    @Column({type: 'int',  default: 0 })
    created_by: number;
    @Column({type: 'int',  default: 0 })
    updated_by: number;
    @CreateDateColumn({type: 'timestamp', default: () => 'CURRENT_TIMESTAMP',})
    created: Date;
    @UpdateDateColumn({type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP',})
    updated: Date;
}
