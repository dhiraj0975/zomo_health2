import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from "../../constant";

@Entity(tableConstant.COMPANIES.TBL_COMPANY_SALES)
export class CompanySalesEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column()
    org_id: number;
    @Column({ length: 251, nullable: true })
    demo_lead: string;
    @Column('date')
    demo_date: string;
    @Column('date')
    onboarding_date: string;
    @Column('date')
    launch_date: string;
    @Column({ type: 'text', nullable: true })
    demo_recording: string;
    @Column({ type: 'text', nullable: true })
    demo_notes: string;
    @Column({ default: 0 })
    is_zomo_health_selected: number;
    @Column({ type: 'text', nullable: true })
    decline_reason: string;
    @Column({ type: 'int', default: 1 })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
