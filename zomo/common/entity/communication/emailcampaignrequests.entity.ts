import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
@Entity({ name: tableConstant.COMMUNICATION.TBL_COM_EMAIL_CAMPAIGNS_REQUESTS })
export class EmailCampaignRequestsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('varchar', { length: 2000, nullable: true })
    subject: string;
    @Column('text', { nullable: true })
    file: string;
    @Column({ type: 'integer', nullable: true })
    from_email_id: number;
    @Column('longtext', { nullable: true })
    template_content: string;
    @Column('varchar', { length: 255, nullable: true })
    schedule_datetime: string;
    @Column('varchar', { length: 255, nullable: true })
    interval_from: string;
    @Column('varchar', { length: 255, nullable: true })
    interval_to: string;
    @Column({ type: 'integer', nullable: false, default: 0 })
    success_count: number;
    @Column({ type: 'integer', nullable: false, default: 0 })
    fail_count: number;
    @Column('longtext', { nullable: true })
    sheet_header: string;
    @Column('varchar', { length: 255, nullable: true })
    hash: string;
    @Column('varchar', { length: 355, nullable: false, default: 'UTC' })
    timezone: string;
    @Column('longtext', { nullable: true })
    test_mail_user_data: string;
    @Column('varchar', { length: 355, nullable: false, default: 'UTC' })
    campaign_title: string;
    @Column('integer', { nullable: true, default: 0 })
    request_status: number;
    @Column('longtext', { nullable: true })
    attachment: string;
    @Column('timestamp', { nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    schedule_utc_datetime: Date;
    @Column('integer', { nullable: true, default: 0 })
    request_flag: number;
    @Column('integer', { nullable: true, default: 0 })
    duplicate_record: number;
    @Column('integer', { nullable: true, default: 0 })
    total_reschedule: number;
    @Column('integer', { nullable: false })
    role_id: number;
    @Column('integer', { nullable: true, default: 0 })
    approval_status: number;
    @Column('longtext', { nullable: true })
    approval_status_data: string;
    @Column('varchar', { length: 500, nullable: true })
    testemail: string;
    @Column('integer', { nullable: true, default: 0 })
    sendtestmailstatus: number;
    @Column('integer', { nullable: true, default: 0 })
    for_org_id: number;
    @Column('integer', { nullable: true, default: 0 })
    with_option: number;
    @Column('longtext', { nullable: true })
    org_filter_data: string;
    @Column('integer', { nullable: true, default: 0 })
    use_def_tem_id: number;
    @Column('integer', { nullable: true, default: 0 })
    group_id: number;
    @Column('integer', { nullable: true, default: 0 })
    parent_id: number;
    @Column('integer', { nullable: true, default: 0 })
    template_type: number;
    @Column('integer', { nullable: true, default: 0 })
    template_item_id: number;
    @Column('integer', { nullable: true, default: 0 })
    copied: number;
    @Column('integer', { nullable: true, default: 0 })
    details_type: number;
    @Column('varchar', { length: 255, nullable: true })
    test_user_role: string;
    @Column('varchar', { length: 500, nullable: true })
    template_item_sub_id: string;
    @Column('integer', { default: 0 })
    test_user_id: number;
    @Column('integer', { nullable: true, default: 1 })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @Column('integer', { nullable: true, default: 0 })
    created_by: number;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_date: Date;
    @Column('integer', { nullable: true, default: 0 })
    updated_by: number;
}
