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
@Entity({ name: tableConstant.TBL_TAB_SETTINGS })
export class UserTabSettingsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: true })
    user_id: number;
    @Column('integer', { nullable: true, default: 0 })
    s_theme: number;
    @Column('integer', { nullable: true, default: 0 })
    s_report: number;
    @Column('integer', { nullable: true, default: 0 })
    s_chat: number;
    @Column('integer', { nullable: true, default: 0 })
    s_user: number;
    @Column('integer', { nullable: true, default: 0 })
    s_activity_tracker: number;
    @Column('integer', { nullable: true, default: 0 })
    s_event: number;
    @Column('integer', { nullable: true, default: 0 })
    s_quicklink: number;
    @Column('integer', { nullable: true, default: 0 })
    s_document: number;
    @Column('integer', { nullable: true, default: 0 })
    s_challenge: number;
    @Column('integer', { nullable: true, default: 0 })
    s_incentive: number;
    @Column('integer', { nullable: true, default: 0 })
    s_mass_communication: number;
    @Column('integer', { nullable: true, default: 0 })
    s_reimbursement: number;
    @Column('integer', { default: 1 })
    status: number;
    @CreateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
