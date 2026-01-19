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
@Entity(tableConstant.MY_PLAN.TBL_MP_BUSINESS_RULE)
export class MyPlanBusinessRuleEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'varchar', length: 512, nullable: true, default: null })
    name: string;
    @Column({ type: 'int' })
    biometric_id: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    organization_id: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    module_id: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    activity_id: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    progress: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    progress_setting: number;
    @Column({ type: 'timestamp', nullable: true, default: null })
    c_start_date: Date;
    @Column({ type: 'timestamp', nullable: true, default: null })
    c_end_date: Date;
    @Column({ type: 'int' })
    type: number;
    @Column({ type: 'float' })
    s_range: number;
    @Column({ type: 'float', nullable: false, default: 0 })
    e_range: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    gender: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    age: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    ageoption: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    age_s_range: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    age_e_range: number;
    @Column({ type: 'int' })
    created_by: number;
    @Column({ type: 'int', nullable: false, default: 1 })
    status: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
