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
@Entity({ name: tableConstant.HEALTH_ASSESSMENT.TBL_HA_REPORT_DOWNLOADS })
export class AssessmentReportDownloadsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: false })
    user_id: number;
    @Column('varchar', { length: 250, nullable: false })
    company_id: string;
    @Column('text', { nullable: false })
    searchcond: string;
    @Column('varchar', { length: 250, nullable: false })
    assessment: string;
    @Column('varchar', { length: 250, nullable: false })
    biometric: string;
    @Column('text', { nullable: false })
    srccond: string;
    @Column('varchar', { length: 250, nullable: false })
    HRAbiometric: string;
    @Column('varchar', { length: 250, nullable: false })
    Fbiometric: string;
    @Column('text', { nullable: false })
    Reset: string;
    @Column('text', { nullable: false })
    hracondition: string;
    @Column('varchar', { length: 250, nullable: false })
    file_name: string;
    @Column('varchar', { length: 50, nullable: false })
    report_type: string;
    @Column('varchar', { length: 250, nullable: false })
    email: string;
    @Column('varchar', { length: 50, nullable: false })
    request_from: string;
    @Column('integer', { nullable: false, default: 1 })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_date: Date;
}
