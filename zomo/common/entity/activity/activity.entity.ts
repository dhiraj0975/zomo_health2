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
@Entity({ name: tableConstant.ACTIVITIES.TBL_ACTIVITIES })
export class ActivityEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: true })
    category_id: number;
    @Column('varchar', { nullable: true })
    activity_name: string;
    @Column('varchar', { nullable: true })
    accebility: string;
    // @Column('varchar', { nullable: true }) remove as per instruction
    // icon: string;
    // @Column('text', { nullable: true })
    // image: string;
    @Column('varchar', { nullable: true })
    plugin: string;
    @Column('varchar', { nullable: true })
    controller: string;
    @Column('varchar', { nullable: true })
    action: string;
    @Column('text', { nullable: true })
    ext_link: string;
    @Column('text', { nullable: true })
    description: string;
    @Column('integer', { nullable: true })
    enable_activity_tracker: number;
    @Column('integer', { nullable: true })
    enable_reimbursement: number;
    @Column('integer', { nullable: true })
    activity_display: number;
    @Column('integer', { nullable: true, default: 0 })
    is_age_common: number;
    @Column('text', { nullable: true })
    newlink: string;
    @Column('integer', { nullable: true })
    status: number;
    @Column('integer', { nullable: true})
    created_by: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    added_date: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_date: Date;
}
