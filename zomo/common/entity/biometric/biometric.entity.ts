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
@Entity({ name: tableConstant.BIOMETRIC.BIR_BIOMETRIC })
export class BiometricEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'varchar', length: 256 })
    biometric: string;
    @Column({ type: 'int' })
    status: number;
    @Column({ type: 'int' })
    start_range: number;
    @Column({ type: 'int' })
    end_range: number;
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
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
