import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';
import { tableConstant } from '../../constant';
;
;
const argon2 = require('argon2');
@Entity(tableConstant.COMPANIES.TBL_COMPANY_NUMBER_OF_LIVE_REPORTS)
export class OrgCensusReportEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'text', nullable: true })
    file: string;
    @Column('integer')
    status: number;
    @Column('integer')
    flage: number;
    @Column({ type: 'text', nullable: true })
    report_date: string;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
