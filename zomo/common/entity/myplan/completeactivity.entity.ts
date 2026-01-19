import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
;
;
@Entity(tableConstant.MY_PLAN.TBL_MP_COMPLETE_ACTIVITY)
export class MyPlanCompleteActivityEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Index()
    @Column({ type: 'int' })
    user_id: number;
    @Index()
    @Column({ type: 'int' })
    custom_id: number;
    @Index()
    @Column({ type: 'int' })
    activity_id: number;
    @Column({ type: 'text' })
    image: string;
    @Column({ type: 'text', nullable: true, default: null })
    notes: string;
    @Column({ type: 'int' })
    created_by: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    source: number;
    @Column({ type: 'int', nullable: false, default: 1 })
    status: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    aftercompletestatus: number;
    @Index()
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
