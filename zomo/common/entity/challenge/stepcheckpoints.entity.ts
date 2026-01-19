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
@Entity({ name: tableConstant.CHALLENGE.TBL_CH_STEP_CHECKPOINTS })
export class StepCheckpointsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: false })
    challenge_id: number;
    @Column({ type: 'int', nullable: false })
    schedule_id: number;
    @Column({ type: 'int', nullable: false })
    checkpointvalue: number;
    @Column({ type: 'varchar', length: 256, nullable: false })
    checkpointtype: string;
    @Column({ type: 'int', nullable: false })
    checkpointdays: number;
    @Column({ type: 'tinyint', nullable: false })
    status: number;
    @CreateDateColumn({ type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: null, onUpdate: 'CURRENT_TIMESTAMP' })
    modified_date: Date;
}
