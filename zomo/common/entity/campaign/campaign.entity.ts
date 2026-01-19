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
@Entity({ name: tableConstant.CAMPAIGN.TBL_CAMPAIGN })
export class CampaignEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: true })
    organization_id: number;
    @Column('text', { nullable: true })
    location_ids: string;
    @Column('text', { nullable: true })
    department_ids: string;
    @Column('text', { nullable: true })
    campaign_name: string;
    @Column('text', { nullable: true })
    tab_titled: string;
    @Column('integer', { nullable: true })
    tab_order: number;
    @Column('varchar', { nullable: true })
    d_start_date: Date;
    @Column('varchar', { nullable: true })
    d_end_date: Date;
    @Column('varchar', { nullable: true })
    start_date: Date;
    @Column('varchar', { nullable: true })
    end_date: Date;
    @Column('integer', { nullable: true })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    added_date: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_date: Date;
    @Column('integer', { nullable: true })
    is_copy: number;
}
