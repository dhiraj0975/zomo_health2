import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
@Entity({ name: tableConstant.COMMUNICATION.TBL_COM_EMAIL_CAMPAIGNS_TEMPLATES})
export class EmailCampaignTemplatesEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('varchar', { length: 1000, nullable: true })
    subject: string;
    @Column('longtext', { nullable: true })
    template_content: string;
    @Column('integer', { nullable: false })
    role_id: number;
    @Column('integer', { default: 0 })
    temp_type: number;
    @Column('integer', { nullable: true, default: 0 })
    org_id: number;
    @Column('integer', { nullable: true, default: 0 })
    go_type: number;
    @Column('varchar', { length: 255, nullable: true })
    created_name: string;
    @Column('varchar', { length: 255, nullable: true })
    org_name: string;
    @Column({ type: 'integer', nullable: false, default: 0 })
    details_type: number;
    @Column('integer', { nullable: true, default: 1 })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @Column('integer', { nullable: true, default: null })
    created_by: number;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_date: Date;
    @Column('integer', { nullable: true, default: null})
    updated_by: number;
}
