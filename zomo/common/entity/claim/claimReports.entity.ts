import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
;
;
@Entity({ name: tableConstant.CLAIM.TBL_CL_REPORTS })
export class ClaimReportsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('varchar',{ length: 255 })
    user_id: string;
    @Column('varchar',{ length: 255 })
    org_id: string;
    @Column('varchar',{ length: 125 })
    first_name: string;
    @Column('varchar',{ length: 125 })
    last_name: string;
    @Column('varchar',{ length: 250 })
    uss_number: string;
    @Column('varchar',{ length: 250 })
    email: string;
    @Column({ enum: ['m', 'f', 'o'] })
    gender: 'm' | 'f' | 'o';
    @Column()
    birth_date: Date;
    @Column('varchar',{ length: 250 })
    employee_id: string;
    @Column('varchar',{ length: 250 })
    claim_number: string;
    @Column()
    date_of_service: Date;
    @Column({ type: 'float', precision: 10, scale: 2 })
    cost_of_service: number;
    @Column({ type: 'text' })
    icd_code: string;
    @Column('varchar',{ length: 125 })
    provider_type: string;
    @Column('varchar',{ length: 50 })
    ph_icd_code: string;
    @Column()
    ndc_number: number;
    @Column('varchar',{ length: 255 })
    label_name: string;
    @Column('varchar',{ length: 255 })
    therapeutic_class: string;
    @Column({ type: 'int', default: 1 })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
