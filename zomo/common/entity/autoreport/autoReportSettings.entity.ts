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
@Entity({ name: tableConstant.TBL_AU_AUTO_REPORT_SETTINGS })
export class AutoReportSettingsEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: false, default: null })
    org_id: number;
    @Column({ type: 'int', nullable: false, default: 11 })
    user_role: number;
    @Column({ type: 'varchar', length: 51, nullable: true, default: null })
    membership_code: string;
    @Column({ type: 'int', nullable: false, default: null })
    module_id: string;
    @Column({ type: 'int', nullable: false, default: null })
    frequency_type: number;
    @Column({ type: 'text', nullable: true })
    weekly_days: string;
    @Column({ type: 'int', nullable: true })
    monthly_basis: number;
    @Column({ type: 'int', nullable: true })
    monthly_date_basis: number;
    @Column({ type: 'int', nullable: true })
    monthly_basis_type: number;
    @Column({ type: 'varchar', length: 255, nullable: true})
    monthly_basis_day: string;
    @Column({ type: 'int', nullable: true})
    year_basis_day: number;
    @Column({ type: 'int', nullable: true })
    year_basis_month: number;
    @Column({ type: 'varchar', length: 255, nullable: true})
    f_module_report_type: string;
    @Column({ type: 'longtext', nullable: true})
    f_module_items: string;
    @Column({ type: 'varchar', length: 255, nullable: true})
    f_health_plans: string;
    @Column({ type: 'int', nullable: true})
    f_engagement_report: number;
    @Column({ type: 'text', nullable: true, default: null })
    f_department: string;
    @Column({ type: 'text', nullable: true, default: null })
    f_location: string;
    @Column({ type: 'text', nullable: true, default: null })
    f_country: string;
    @Column({ type: 'text', nullable: true, default: null })
    f_state: string;
    @Column({ type: 'text', nullable: true, default: null })
    f_city: string;
    @Column({ type: 'varchar', length: 255, nullable: true})
    f_from_date: string;
    @Column({ type: 'varchar', length: 255, nullable: true})
    f_to_date: string;
    @Column({ type: 'int', nullable: true, default: null })
    f_terminated_users: number;
    @Column({ type: 'longtext', nullable: true, default: null })
    send_emails: string;
    @Column({ type: 'longtext', nullable: true, default: null })
    email_subject: string;
    @Column({ type: 'longtext', nullable: true, default: null })
    email_content: string;
    @Column({ type: 'int', nullable: false, default: 0 })
    status: number;
    @Column({ type: 'varchar', length: 255, nullable: true})
    challenge_status: string;
    @Column({ type: 'varchar', length: 255, nullable: true})
    challenge_type: string;
    @Column({ type: 'longtext', nullable: true, default: null })
    setting_conditions: string;
    @Column({ type: 'longtext', nullable: true, default: null })
    send_cc_emails: string;
    @Column({ type: 'varchar', length: 255, nullable: true})
    timezone_time: string;
    @Column({ type: 'varchar', length: 455, nullable: false , default:'UTC'})
    org_timezone: string;
    @Column({ type: 'int', nullable: true})
    created_by: number;
    @Column({ type: 'int', nullable: true })
    updated_by: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated_date: Date;
    @Column({ type: 'longtext', nullable: true, default: null })
    report_fields: string;
    @Column({ type: 'longtext', nullable: true, default: null })
    otheroptions: string;
    @Column({ type: 'varchar', length: 255, nullable: true, default: null })
    report_type: string;
}
