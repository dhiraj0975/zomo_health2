import {
    BaseEntity,
    BeforeInsert,
    BeforeUpdate,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
import { MonthlyBasis, RecurringPatternTypeCoach } from '../../enum';
@Entity({ name: tableConstant.COACH.TBL_CO_NOTES })
export class CoachNotesEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: true })
    coach_id: number;
    @Column('integer', { nullable: false })
    user_id: number;
    @Column('integer', { nullable: true })
    contant_type: number;
    @Column('varchar',{ length: 256, nullable: false })
    subject: string;
    @Column('timestamp', { nullable: true })
    start_date: Date;
    @Column('time', { nullable: true })
    start_time: string;
    @Column('int', { nullable: true })
    interaction_type: number;
    @Column('text', { nullable: false })
    assign_task: string;
    @Column('text', { nullable: false })
    note: string;
    @Column('timestamp', { nullable: false })
    due_date: Date;
    @Column('varchar',{ length: 50, nullable: false, default: 'UTC' })
    timezone: string;
    @Column({nullable: true, type: 'enum', enum: RecurringPatternTypeCoach })
    recurring_pattern_type: RecurringPatternTypeCoach;
    @Column('varchar',{ length: 50, nullable: true })
    weekly_basis_day: string;
    @Column({nullable: true, type: 'enum', enum: MonthlyBasis })
    monthly_basis: MonthlyBasis;
    @Column('varchar',{ length: 50, nullable: true })
    monthly_date_basis: string;
    @Column('int', { nullable: true })
    monthly_basis_Type: number;
    @Column('int', { nullable: true })
    monthly_basis_day: number;
    @Column('int', { nullable: true })
    year_basis_day: number;
    @Column('int', { nullable: true })
    year_basis_month: number;
    @Column('int', { nullable: true })
    priority: number;
    @Column('int', { nullable: false })
    status: number;
    @Column('int', { nullable: false })
    user_status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    modified_date: Date;
    @BeforeInsert()
    @BeforeUpdate()
    async hashPrecurringPattern() {
        if (this.recurring_pattern_type) {
            this.recurring_pattern_type = RecurringPatternTypeCoach[this.recurring_pattern_type];
        } else {
            delete this.recurring_pattern_type;
        }
    }
    @BeforeInsert()
    @BeforeUpdate()
    async monthlyBasis() {
        if (this.monthly_basis) {
            this.monthly_basis = MonthlyBasis[this.monthly_basis];
        } else {
            delete this.monthly_basis;
        }
    }
}
