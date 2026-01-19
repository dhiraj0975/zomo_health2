import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from "../../constant";

@Entity(tableConstant.COMPANIES.TBL_COMPANY_CONTRACT)
export class CompanyContractEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column()
    org_id: number;
    @Column({ length: 256, nullable: true })
    billing_email: string;
    @Column({ default: 0 })
    billing_frequency: number;
    @Column({ length: 256, nullable: true })
    billing_name: string;
    @Column({ type: 'longtext', nullable: true })
    engagement_manager_name: string;
    @Column()
    package: number;
    @Column('date')
    contract_start_date: string;
    @Column('date')
    contract_end_date: string;
    @Column('date')
    billing_start_date: string;
    @Column('date')
    billing_end_date: string;
    @Column()
    date_of_expense_submission: Date;
    @Column({ type: 'longtext', nullable: true })
    expense_description_amount: string;
    @Column({ length: 256, default: '{"1":"0","2":"0"}' })
    reminder_contract: string;
    @Column({ length: 256, nullable: true })
    contract_reminder_email: string;
    @Column({ length: 256, nullable: true })
    broker: string;
    @Column({ type: 'text', nullable: true })
    csa: string;
    @Column({ type: 'text', nullable: true })
    baa: string;
    @Column({ type: 'text', nullable: true })
    billing_email_cc: string;
    @Column({ type: 'text', nullable: true })
    notes_for_data_team: string;
    @Column({ type: 'text', nullable: true })
    notes_for_design_team: string;
    @Column({ type: 'text', nullable: true })
    branding_guideline_text: string;
    @Column({ type: 'text', nullable: true })
    branding_guideline_image: string;
    @Column({ type: 'text', nullable: true })
    industry: string;
    @Column({ type: 'text', nullable: true })
    additional_agreement: string;
    @Column({ default: 0 })
    created_by: number;
    @Column({ default: 0 })
    updated_by: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
