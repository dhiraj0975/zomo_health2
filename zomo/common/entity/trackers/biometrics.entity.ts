import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
;
;
@Entity({ name: tableConstant.TRACKERS.TBL_FT_BIOMETRICS })
export class FtBiometricsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: true })
    user_id: number;
    @Column({ type: 'int', nullable: true })
    type: number;
    @Column({ type: 'varchar', length: 100, nullable: true })
    weight: string;
    @Column({ type: 'int', default: 0 })
    alc: number;
    @Column({ type: 'varchar', length: 100, nullable: true })
    height_ft: string;
    @Column({ type: 'varchar', length: 100, nullable: true })
    height_in: string;
    @Column({ type: 'varchar', length: 100, nullable: true })
    systolic: string;
    @Column({ type: 'varchar', length: 100, nullable: true })
    diastolic: string;
    @Column({ type: 'varchar', length: 100, nullable: true })
    chol_total: string;
    @Column({ type: 'varchar', length: 100, nullable: true })
    hdl: string;
    @Column({ type: 'varchar', length: 100, nullable: true })
    ldl: string;
    @Column({ type: 'varchar', length: 100, nullable: true })
    triglycerides: string;
    @Column({ type: 'varchar', length: 100, nullable: true })
    glucose_type: string;
    @Column({ type: 'varchar', length: 100, nullable: true })
    glucose_time: string;
    @Column({ type: 'varchar', length: 100, nullable: true })
    glucose: string;
    @Column({ type: 'varchar', length: 100, nullable: true })
    medication: string;
    @Column({ type: 'int', default: 14 })
    source: number;
    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    inserted: Date;
    @Column({ type: 'int', nullable: true })
    status: number;
    @CreateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    added_date: Date;
    @CreateDateColumn({ type: 'timestamp', default: null, onUpdate: 'CURRENT_TIMESTAMP' })
    updated_date: Date;
}
