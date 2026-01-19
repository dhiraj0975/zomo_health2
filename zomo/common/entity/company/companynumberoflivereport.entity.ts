import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { tableConstant } from "../../constant";

@Entity(tableConstant.COMPANIES.TBL_COMPANY_NUMBER_OF_LIVE_REPORTS)
export class CompanyNumberOfLiveReportsEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'text', nullable: true })
    file: string;
    @Column({ type: 'int', default: 0 })
    status: number;
    @Column({ type: 'int', default: 0 })
    flage: number;
    @Column({ type: 'date', nullable: true })
    report_date: string;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
