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
@Entity({ name: tableConstant.CAMPAIGN.TBL_IN_CAMPAIGN_REWARD })
export class CampaignRewardEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: true })
    campaign_id: number;
    @Column('integer', { nullable: true })
    order_id: number;
    @Column('varchar', { length: 501, nullable: true })
    reward_name: string;
    @Column('text', { nullable: true })
    reward_desc: string;
    @Column('integer', { nullable: true })
    ins_reward: number;
    @Column('text', { nullable: true })
    ins_ids: string;
    @Column('integer', { nullable: true })
    cash_reward: number;
    @Column('text', { nullable: true })
    cash_ids: string;
    @Column('integer', { nullable: true })
    other_reward: number;
    @Column('text', { nullable: true })
    other_ids: string;
    @Column('text', { nullable: true })
    related_activity: string;
    @Column('text', { nullable: true })
    related_challenge: string;
    @Column('text', { nullable: true })
    related_category: string;
    @Column('integer', { nullable: true })
    cat_activity_visibility: number;
    @Column('integer', { nullable: true })
    hire_date: number;
    @Column('integer', { nullable: true })
    hire_date_count: number;
    @Column('integer', { nullable: true })
    user_eligible: number;
    @Column('integer', { nullable: true })
    is_display_status: number;
    @Column('integer', { nullable: true })
    eligibility: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    added_date: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_date: Date;
    @Column('integer', { nullable: true })
    status: number;
    @Column('varchar', { length: 255, nullable: true })
    org_tab_setting: string;
}
