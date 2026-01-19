import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';

@Entity({ name: tableConstant.REPORT.TBL_RE_ENGAGEMENT_COMPARISON_REPORT })
export class EngagementComparisonReportsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: true })
    org_id: number;
    @Column('integer', { nullable: true })
    user_id: number;
    @Column('integer', { default: 11 })
    user_role: number;
    @Column('varchar', { length: 51, nullable: true })
    membership_code: string;
    @Column('text', { nullable: true })
    condition: string;
    @Column('varchar', { length: 255, nullable: true })
    report_type: string;
    @Column('text', { nullable: true })
    file_name: string;
    @Column('varchar', { length: 51, default: 0 })
    total_download: string;
    @Column('datetime', { nullable: true })
    request_date?: Date;
    @Column('text', { nullable: true })
    email: string;
    @Column('integer', { default: 0 })
    is_range: number;
    @Column('datetime', { nullable: true })
    start_date_range: string;
    @Column('datetime', { nullable: true })
    end_date_range: string;
    @Column('text', { nullable: true })
    camp_id: string;
    @Column('integer', { default: 0 })
    request_source: number;
    @Column('integer', { default: 0 })
    email_status: number;
    @Column('integer', { default: 0 })
    report_setting_id: number;
    @Column('integer', { default: 0 })
    auto_report_type: number;
    @Column('varchar', { length: 255, nullable: true })
    auto_report_zip_password: string;
    @Column('varchar', { length: 255, nullable: true })
    report_item_status: string;
    @Column('varchar', { length: 255, nullable: true })
    report_item_type: string;
    @Column('longtext', { nullable: true })
    send_cc_emails: string;
    @Column('varchar', { length: 455, default: 'UTC' })
    request_timezone: string;
    @Column('varchar', { length: 455, nullable: true })
    request_timezone_time: string;
    @Column('longtext', { nullable: true })
    otheroptions: string;
    @Column('longtext', { nullable: true })
    report_fields: string;
    @Column('longtext', { nullable: true })
    department_id: string;
    @Column('longtext', { nullable: true })
    location: string;
    @Column('text', { nullable: true })
    error_message: string;
    @Column('integer', { nullable: true })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_date: Date;
}
