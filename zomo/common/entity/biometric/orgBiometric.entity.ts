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
@Entity({ name: tableConstant.BIOMETRIC.BIR_ORG_BIOMETRIC })
export class OrgBiometricEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int' })
    company_id: number;
    @Column({ type: 'int' })
    biometric: number;
    @Column()
    test1_start_date: Date;
    @Column()
    test1_end_date: Date;
    @Column()
    test2_start_date: Date;
    @Column()
    test2_end_date: Date;
    @Column({ type: 'float', default: 0 })
    start_range_male: number;
    @Column({ type: 'float', default: 0 })
    end_range_male: number;
    @Column({ type: 'float', default: 0 })
    start_range_female: number;
    @Column({ type: 'float', default: 0 })
    end_range_female: number;
    @Column({ type: 'int', default: 0 })
    is_optional: number;
    @Column({ type: 'int', default: 0 })
    is_optional_type: number;
    @Column({ type: 'int', default: 0 })
    is_required: number;
    @Column({ type: 'float', default: 0 })
    graph_low_start: number;
    @Column({ type: 'float', default: 0 })
    graph_low_end: number;
    @Column({ type: 'float', default: 0 })
    graph_mod_start: number;
    @Column({ type: 'float', default: 0 })
    graph_mod_end: number;
    @Column({ type: 'float', default: 0 })
    graph_high_start: number;
    @Column({ type: 'float', default: 0 })
    graph_high_end: number;
    @Column({ type: 'float', default: 0 })
    graph_vhigh_start: number;
    @Column({ type: 'float', default: 0 })
    graph_vhigh_end: number;
    @Column({ type: 'int' })
    created_by: number;
    @Column({ type: 'int', default: 0 })
    updated_by: number;
    @Column({ type: 'int' })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
