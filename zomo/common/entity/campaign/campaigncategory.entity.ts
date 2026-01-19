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
@Entity({ name: tableConstant.CAMPAIGN.TBL_IN_CAMPAIGN_CATEGORY })
export class CampaignCategoryEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: true })
    campaign_id: number;
    @Column('integer', { nullable: true })
    order_id: number;
    @Column('integer', { nullable: true })
    category_id: number;
    @Column('integer', { nullable: true })
    reward_id: number;
    @Column('varchar', { length: 500, nullable: true })
    cust_name: string;
    @Column('text', { nullable: true })
    cust_description: string;
    @Column('varchar', { length: 100, nullable: true })
    quentity: string;
    @Column('varchar', { length: 11, nullable: true })
    required_by_user: string;
    @Column('varchar', { length: 11, nullable: true })
    required_by_spouse: string;
    @Column('varchar', { length: 11, nullable: true })
    frequincy: string;
    @Column('varchar', { length: 100, nullable: true })
    frequincy_max_point: string;
    @Column('varchar', { length: 100, nullable: true })
    point_for_each: string;
    @Column('varchar', { length: 100, nullable: true })
    max_point: string;
    @Column('varchar', { length: 100, nullable: true })
    ac_max: string;
    @Column('varchar', { length: 100, nullable: true })
    ac_min: string;
    @Column('varchar', { length: 100, nullable: true })
    per_change: string;
    @Column('integer', { nullable: true })
    alt_activity: number;
    @Column('varchar', { length: 100, nullable: true })
    alt_act_point: string;
    @Column('integer', { nullable: true })
    reward_for: number;
    @Column('integer', { nullable: false, default: 0 })
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
    @Column('integer', { default: 0 })
    consider_after_deadline: number;
}
