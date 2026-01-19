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
@Entity({ name: tableConstant.CAMPAIGN.TBL_IN_CAMPAIGN_CHALLENGE })
export class CampaignChallengeEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: true })
    campaign_id: number;
    @Column('integer', { nullable: true })
    challenge_id: number;
    @Column('integer', { nullable: true })
    challenge_schedule_id: number;
    @Column('integer', { nullable: true })
    reward_id: number;
    @Column('integer', { nullable: true })
    reward_for: number;
    @Column('varchar', { length: 100, nullable: true })
    point: string;
    @Column('varchar', { nullable: true })
    start_date: string;
    @Column('varchar', { nullable: true })
    end_date: string;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    added_date: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_date: Date;
    @Column('integer', { nullable: true })
    order_id: number;
    @Column('integer', { nullable: true })
    status: number;
    @Column('varchar', { nullable: true })
    point_end_date: string;
    @Column('varchar', { nullable: true })
    after_deadline_date: string;
    @Column('integer', { default: 0 })
    consider_after_deadline: number;
}
