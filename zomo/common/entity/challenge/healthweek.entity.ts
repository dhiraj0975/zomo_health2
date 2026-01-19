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
@Entity({ name: tableConstant.CHALLENGE.TBL_CH_HEALTH_WEEK })
export class HealthWeekEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: false })
    challenge_id: number;
    @Column({ type: 'int', nullable: false })
    schedule_id: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    week_id: number;
    @Column({ type: 'text', nullable: false })
    title: string;
    @Column({ type: 'tinyint', nullable: false })
    status: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: null, onUpdate: 'CURRENT_TIMESTAMP' })
    modified_date: Date;
}
