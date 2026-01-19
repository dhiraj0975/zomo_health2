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
import { CronStatus, System_Type } from "../../enum";

const argon2 = require('argon2');
@Entity({ name: tableConstant.CAMPAIGN.TBL_IN_INCENTIVE_REPORTS })
export class IncentiveReportsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: true })
    org_id: number;
    @Column('integer', { nullable: true })
    user_id: number;
    @Column('integer', { nullable: true })
    user_role: number;
    @Column('varchar', { length: 51, nullable: true })
    membership_code: string;
    @Column('text', { nullable: true })
    condition: string;
    @Column('varchar', { length: 51, nullable: true })
    report_type: string;
    @Column('text', { nullable: true })
    file_name: string;
    @Column('integer', { default: 0 })
    total_download: number;
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
    engagement_report: number;
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
    @Column('text', { nullable: true })
    error_message: string;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_date: Date;
    @Column('integer', { nullable: true })
    status: number;
    @Column({
        type: 'enum',
        enum: System_Type,
        default: System_Type.NEW,
    })
    system_type: System_Type;
    @Column({
        type: 'enum',
        enum: CronStatus,
        default: CronStatus.DEFAULT,
    })
    cron_status: CronStatus;
    @BeforeInsert()
    @BeforeUpdate()
    async hashPassword() {
        if (this.auto_report_zip_password && this.auto_report_zip_password !== '') {
            this.auto_report_zip_password = Buffer.from(await argon2.hash(this.auto_report_zip_password)).toString('base64');
        } else {
            delete this.auto_report_zip_password;
        }
    }
}
