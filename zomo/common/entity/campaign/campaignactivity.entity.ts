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
@Entity({ name: tableConstant.CAMPAIGN.TBL_CAMPAIGN_ACTIVITY })
export class CampaignActivityEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: true })
    campaign_id: number;
    @Column('integer', { nullable: true })
    order_id: number;
    @Column('integer', { nullable: true })
    activity_id: number;
    @Column('integer', { nullable: true })
    reward_id: number;
    @Column('text', { nullable: true })
    cust_name: string;
    @Column('text', { nullable: true })
    cust_description: string;
    @Column('integer', { nullable: true })
    opentype: number;
    @Column('integer', { nullable: true })
    openinternal: number;
    @Column('text', { nullable: true })
    openexternal: string;
    @Column('integer', { nullable: true })
    video: number;
    @Column('text', { nullable: true })
    quentity: string;
    @Column('text', { nullable: true })
    required_by_user: string;
    @Column('text', { nullable: true })
    required_by_spouse: string;
    @Column('text', { nullable: true })
    frequincy: string;
    @Column('text', { nullable: true })
    frequincy_max_point: string;
    @Column('text', { nullable: true })
    point_for_each: string;
    @Column('text', { nullable: true })
    max_point: string;
    @Column('text', { nullable: true })
    ac_max: string;
    @Column('text', { nullable: true })
    ac_min: string;
    @Column('text', { nullable: true })
    per_change: string;
    @Column('integer', { nullable: true })
    alt_activity: number;
    @Column('text', { nullable: true })
    alt_act_point: string;
    @Column('text', { nullable: true })
    steps: string;
    @Column('integer', { nullable: true })
    min_act_req_camp: number;
    @Column('integer', { nullable: true })
    source_type: number;
    @Column('integer', { nullable: true })
    count_type: number;
    @Column('integer', { nullable: true })
    category_visibility: number;
    @Column('integer', { nullable: true })
    is_display_status: number;
    @Column('integer', { nullable: true })
    is_hidden_on_activity_page: number;
    @Column('varchar', { nullable: true })
    start_date: string;
    @Column('varchar', { nullable: true })
    end_date: string;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    added_date: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_date: Date;
    @Column('integer', { nullable: true })
    status: number;
    @Column('varchar', { nullable: true })
    point_end_date: string;
    @Column('varchar', { nullable: true })
    after_deadline_date: string;
    @Column('integer', { nullable: true })
    consider_after_deadline: number;
}
