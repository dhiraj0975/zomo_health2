import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
@Entity({ name: tableConstant.COMMUNICATION.TBL_COM_MAIL_SCHEDULERS })
export class MailSchedulersEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: false })
    campaign_id: number;
    @Column('varchar', { length: 355, nullable: false })
    from_email: string;
    @Column('varchar', { length: 355, nullable: true })
    from_email_name: string;
    @Column('varchar', { length: 355, nullable: false })
    to_email: string;
    @Column('longtext', { nullable: true })
    user_json: string;
    @Column('longtext', { nullable: true })
    attachment: string;
    @Column('timestamp', { nullable: false })
    schedule_datetime: Date;
    @Column('text', { nullable: true })
    subject: string;
    @Column('text', { nullable: true })
    response_message: string;
    @Column('integer', { nullable: false })
    role_id: number;
    @Column('integer', { nullable: false, default: 0 })
    total_reschedule: number;
    @Column('integer', { nullable: false, default: 0 })
    parent_campaign_id: number;
    @Column('integer', { default: 0 })
    template_type: number;
    @Column('integer', { default: 0 })
    template_item_id: number;
    @Column('integer', { default: 0 })
    org_id: number;
    @Column('varchar', { length: 255, nullable: true })
    org_code: string;
    @Column('integer', { default: 0 })
    details_type: number;
    @Column('varchar', { length: 255, nullable: true })
    user_role: string;
    @Column('varchar', { length: 500, nullable: true })
    template_item_sub_id: string;
    @Column('integer', { default: 0 })
    user_id: number;
    @Column('integer', { default: 0 })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_date: Date;
}
