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
@Entity({ name: tableConstant.CHALLENGE.TBL_CH_WEEKS_STEPS })
export class WeeksStepsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: true, default: null })
    week_no: number;
    @Column({ type: 'int', nullable: true, default: null })
    week_steps: number;
    @Column({ type: 'int', nullable: true, default: null })
    days_week: number;
    @Column({ type: 'int', nullable: true, default: null })
    challenge_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    schedule_id: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    move_more_goal: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    move_more_goal_type: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    f_suggestion: number;
    @Column({ type: 'timestamp', nullable: true, default: null })
    start_date: Date;
    @Column({ type: 'timestamp', nullable: true, default: null })
    end_date: Date;
    @Column({ type: 'int', nullable: true, default: null })
    status: number;
    @CreateDateColumn({ type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: null, onUpdate: 'CURRENT_TIMESTAMP' })
    modified_date: Date;
}
