import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from "../../constant";

@Entity(tableConstant.COMPANIES.TBL_COMPANY_CEM_INFO)
export class CompanyCEMInfoEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column()
    org_id: number;
    @Column({ type: 'text', nullable: true })
    client_names: string;
    @Column({ type: 'text', nullable: true })
    client_emails: string;
    @Column({ type: 'text', nullable: true })
    broker_names: string;
    @Column({ type: 'text', nullable: true })
    broker_emails: string;
    @Column({ type: 'text', nullable: true })
    program_description: string;
    @Column({ type: 'text', nullable: true })
    program_deadline: string;
    @Column({ type: 'text', nullable: true })
    incentive: string;
    @Column({ type: 'text', nullable: true })
    spouses: string;
    @Column({ type: 'text', nullable: true })
    communications: string;
    @Column({ type: 'text', nullable: true })
    census_notes: string;
    @Column({ type: 'text', nullable: true })
    wellness_meeting: string;
    @Column({ type: 'text', nullable: true })
    medical_carrier_tpa: string;
    @Column({ type: 'text', nullable: true })
    funding_level: string;
    @Column({ type: 'text', nullable: true })
    wellness_funds: string;
    @Column({ type: 'text', nullable: true })
    employee_benefits: string;
    @Column({ type: 'text', nullable: true })
    file_notes: string;
    @Column({ type: 'text', nullable: true })
    wellness_vendor_notes: string;
    @Column({ type: 'text', nullable: true })
    wellness_committee: string;
    @Column({ type: 'text', nullable: true })
    other_notes: string;
    @Column('date',{ nullable: true })
    ooo_start_date: string;
    @Column('date',{ nullable: true })
    ooo_end_date: string;
    @Column({ type: 'text', nullable: true })
    ooo_coverage: string;
    @Column({ type: 'text', nullable: true })
    ooo_auto_email: string;
    @Column({ default: 0 })
    created_by: number;
    @Column({ default: 0 })
    updated_by: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
