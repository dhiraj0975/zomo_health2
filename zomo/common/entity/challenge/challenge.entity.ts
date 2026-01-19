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
@Entity({ name: tableConstant.CHALLENGE.TBL_CH_CHALLENGE })
export class ChallengeEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: true, default: null})
    uid: number;
    @Column({ type: 'varchar', length: 500, nullable: true, default: null })
    challenge_name: string;
    @Column({ type: 'text', nullable: true, default: null })
    challenge_desc: string;
    @Column({ type: 'varchar', length: 100, nullable: true, default: null })
    challenge_type: string;
    @Column({ type: 'varchar', length: 500, nullable: true, default: null })
    icon: string;
    @Column({ type: 'varchar', length: 500, nullable: true, default: null })
    logo: string;
    @Column({ type: 'varchar', length: 100, nullable: true, default: null })
    biomatrics: string;
    @Column({ type: 'varchar', length: 100, nullable: true, default: null })
    biomatrics_criteria: string;
    @Column({ type: 'varchar', length: 100, nullable: true, default: null })
    data_entry: string;
    @Column({ type: 'varchar', length: 100, nullable: true, default: null })
    data_interval: string;
    @Column({ type: 'varchar', length: 250, nullable: false })
    bio_challenge_type: string;
    @Column({ type: 'int', nullable: true, default: null })
    activity_id: number;
    @Column({ type: 'text', nullable: true, default: null })
    activity_desc: string;
    @Column({ type: 'varchar', length: 100, nullable: true, default: null })
    stepactivity_type: string;
    @Column({ type: 'int', nullable: true, default: null })
    max_time_day: number;
    @Column({ type: 'int', nullable: true, default: null })
    numberofsteps: number;
    @Column({ type: 'datetime', nullable: true, default: null })
    startdate: Date;
    @Column({ type: 'datetime', nullable: true, default: null })
    enddate: Date;
    @Column({ type: 'int', nullable: true, default: null })
    weektimeframe: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    requirementbased: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    numberofday: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    numberofweek: number;
    @Column({ type: 'int', nullable: true, default: null })
    oz_water_per_day: number;
    @Column({ type: 'int', nullable: true, default: 1 })
    status: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    added_date: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: null, onUpdate: 'CURRENT_TIMESTAMP' })
    updated_date: Date;
}
