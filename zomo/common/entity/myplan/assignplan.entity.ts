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
@Entity(tableConstant.MY_PLAN.TBL_MP_ASSIGN_PLAN)
export class MyPlanAssignPlanEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int' })
    plan_id: number;
    @Column({ type: 'int' })
    org_id: number;
    @Column({ type: 'int' })
    activity_id: number;
    @Column({ type: 'int', nullable: false, default: 1 })
    status: number;
    @Column({ type: 'int', nullable: true, default: null })
    based_on: number;
    @Column({ type: 'int' })
    display_block: number;
    @Column({ type: 'datetime', nullable: true, default: null })
    startdate: Date;
    @Column({ type: 'datetime', nullable: true, default: null })
    enddate: Date;
    @Column({ type: 'int', nullable: true, default: null })
    completion_base: number;
    @Column({ type: 'int' })
    display_plan_to: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    display_plan_to_health_source: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    display_plan_to_health: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    c_range: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    completion_on: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    f_range: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    frequency_base: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    is_cron: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    join_based_on: number;
    @Column({ type: 'varchar', length: 500, nullable: true, default: null })
    name: string;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
