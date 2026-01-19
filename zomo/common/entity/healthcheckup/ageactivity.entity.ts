import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
import { Gender } from '../../enum';
;
@Entity({ name: tableConstant.HEALTH_CHECKUP.TBL_HC_AGE_ACTIVITY })
export class AgeActivityEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('text', { nullable: false })
    title: string;
    @Column('integer', { nullable: false })
    group_type: number;
    @Column('integer', { nullable: false })
    age_activity_id: number;
    @Column({
        type: 'enum',
        enum: Gender,
        default: null,
    })
    gender: Gender;
    @Column('integer', { nullable: false, default: 0 })
    min_age: number;
    @Column('integer', { nullable: false, default: 0 })
    max_age: number;
    @Column('integer', { nullable: false, default: 0 })
    org_id: number;
    @Column('integer', { nullable: false, default: 1 })
    created_by: number;
    @Column({ type: 'int', nullable: false, default: 1 })
    status: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    ref_activity_id: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    common_activity_id: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    extrahtmlused: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
