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
@Entity(tableConstant.MY_PLAN.TBL_MP_ASSIGN_RULE)
export class MyPlanAssignRuleEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int' })
    plan_id: number;
    @Column({ type: 'int' })
    rule_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    org_id: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    optional: number;
    @Column({ type: 'timestamp', nullable: true, default: null })
    bstart_date: Date;
    @Column({ type: 'timestamp', nullable: true, default: null })
    bend_date: Date;
    @Column({ type: 'int', nullable: false, default: 0 })
    recommended_base: number;
    @Column({ type: 'int', nullable: false, default: 1 })
    status: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
