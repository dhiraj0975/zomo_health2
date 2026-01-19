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
@Entity({ name: tableConstant.HEALTH_CHECKUP.TBL_HC_FORM_SEND_REQUEST_USERS })
export class FormSendRequestUserEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('text', { nullable: true })
    name: string;
    @Column('text', { nullable: true })
    username: string;
    @Column('text', { nullable: true })
    email: string;
    @Column('integer', { nullable: false, default: 1 })
    email_status: number;
    @Column('text', { nullable: true })
    file: string;
    @Column({ type: 'int', nullable: false, default: 1 })
    status: number;
    @Column({ type: 'int', nullable: false, default: 1 })
    request_id: number;
    @Column({ type: 'int', nullable: true })
    updated_by: number;
    @Column('integer', { nullable: true })
    org_id: number;
    @Column('integer', { nullable: true })
    user_id: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_date: Date;
    @Column('text', { nullable: true })
    response_message: string;
}