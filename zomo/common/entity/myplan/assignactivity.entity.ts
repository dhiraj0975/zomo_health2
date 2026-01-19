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
@Entity(tableConstant.MY_PLAN.TBL_MP_ASSIGN_ACTIVITY)
export class MyPlanAssignActivityEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int' })
    block_id: number;
    @Column({ type: 'int' })
    plan_id: number;
    @Index()
    @Column({ type: 'int' })
    org_id: number;
    @Index()
    @Column({ type: 'int' })
    activity_id: number;
    @Column({ type: 'int', nullable: false, default: 1 })
    status: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    is_month: number;
    @Column({ type: 'int', nullable: false, default: 1 })
    is_month_days: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    based_on: number;
    @Column({ type: 'varchar', length: 512, nullable: true, default: null })
    name: string;
    @Column({ type: 'timestamp', nullable: true, default: null })
    startdate: Date;
    @Column({ type: 'timestamp', nullable: true, default: null })
    enddate: Date;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
