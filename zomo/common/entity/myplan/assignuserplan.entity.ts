import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
;
;
@Entity(tableConstant.MY_PLAN.TBL_MP_ASSIGN_USER_PLAN)
export class MyPlanAssignUserPlanEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int' })
    user_id: number;
    @Column({ type: 'text', nullable: true, default: null })
    plan_id: string;
    @Column({ type: 'text', nullable: true, default: null })
    plan_detail: string;
    @Column({ type: 'text', nullable: true, default: null })
    gc_plan_id: string;
    @Column({ type: 'text', nullable: true, default: null })
    gc_plan_remove: string;
    @Column({ type: 'int', nullable: false, default: 1 })
    status: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
