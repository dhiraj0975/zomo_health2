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
@Entity({ name: tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS })
export class ScheduleChallengeJoinUsersEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: true, default: null })
    schedule_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    challenge_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    user_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    trek_level_id: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    agreement_id: number;
    @Column({ type: 'varchar', length: 256, nullable: true })
    agreement_signed: string;
    @Column({ type: 'varchar', length: 256, nullable: true })
    agreement_name: string;
    @Column({ type: 'int', nullable: true, default: 0 })
    in_ranking: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    in_park_complete: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    in_week_complete: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    signature_type: number;
    @Column({ type: 'text', nullable: true, default: null, comment: 'Relay Race Popup,Mail Detail' })
    relay_race_detail: string;
    @Column({ type: 'text', nullable: true, default: null })
    completed_lock_locations: string;
    @Column({ type: 'int', nullable: true, default: 1 })
    status: number;
    @Column({ type: 'text', nullable: true, default: null })
    relay_race_push_detail: string;
    @CreateDateColumn({ type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
    added_date: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: null, onUpdate: 'CURRENT_TIMESTAMP' })
    update_date: Date;
}
