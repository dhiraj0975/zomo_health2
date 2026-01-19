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
@Entity(tableConstant.MY_PLAN.TBL_MP_JOIN_USER_PLAN)
export class MyPlanJoinUserPlanEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Index()
    @Column({ type: 'int' })
    user_id: number;
    @Index()
    @Column({ type: 'int' })
    plan_id: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    activity_id: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    is_complete: number;
    @Index()
    @Column('datetime', { nullable: true, default: () => 'CURRENT_TIMESTAMP'  })
    complete_date: Date;
    @Column({ type: 'int', nullable: true, default: 1 })
    status: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    progress: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
