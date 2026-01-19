import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
@Entity({ name: tableConstant.REPORT.TBL_RE_QUICK_LINK_REPORT })
export class QuickLinkReReportEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: true, default: null })
    org_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    user_id: number;
    @Column({ type: 'int', nullable: false, default: 11 })
    user_role: number;
    @Column({ type: 'varchar', length: 51, nullable: true, default: null })
    membership_code: string;
    @Column({ type: 'text', nullable: true, default: null })
    condition: string;
    @Column({ type: 'varchar', length: 255, nullable: true, default: null })
    report_type: string;
    @Column({ type: 'text', nullable: true, default: null })
    file_name: string;
    @Column({ type: 'varchar', length: 51, nullable: true, default: 0 })
    total_download: string;
    @Column('datetime', { nullable: true, default: null })
    request_date: Date;
    @Column({ type: 'text', nullable: true, default: null })
    email: string;
    @Column({ type: 'int', nullable: true, default: 0 })
    is_range: number;
    @Column('datetime', { nullable: true, default: null })
    start_date_range: Date;
    @Column('datetime', { nullable: true, default: null })
    end_date_range: Date;
    @Column({ type: 'int', nullable: true, default: null })
    status: number;
    @Column({ type: 'text', nullable: true, default: null })
    camp_id: string;
    @Column({ type: 'int', nullable: false, default: 0 })
    request_source: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    email_status: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    report_setting_id: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    auto_report_type: number;
    @Column({ type: 'varchar', length: 255, nullable: true, default: null })
    auto_report_zip_password: string;
    @Column({ type: 'int', nullable: true, default: 0 })
    report_item_status: number;
    @Column({ type: 'varchar', length: 255, nullable: true, default: null })
    report_item_type: string;
    @Column({ type: 'text', nullable: true, default: null })
    send_cc_emails: string;
    @Column({ type: 'varchar', length: 455, nullable: true, default: 'UTC' })
    request_timezone: string;
    @Column({ type: 'varchar', length: 455, nullable: true, default: null })
    request_timezone_time: string;
    @Column({ type: 'longtext', nullable: true, default: null })
    otheroptions: string;
    @Column({ type: 'longtext', nullable: true, default: null })
    report_fields: string;
    @Column({ type: 'longtext', nullable: true, default: null })
    department_id: string;
    @Column({ type: 'longtext', nullable: true, default: null })
    location: string;
    @Column({ type: 'text', nullable: true, default: null })
    error_message: string;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated_date: Date;
}
