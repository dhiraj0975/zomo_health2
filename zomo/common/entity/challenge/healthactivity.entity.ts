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
@Entity({ name: tableConstant.CHALLENGE.TBL_CH_HEALTH_ACTIVITY })
export class HealthActivityEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'varchar', length: 512, nullable: false })
    name: string;
    @Column({ type: 'int', nullable: false, default: 0 })
    avalue: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    atype: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    amax: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    frequency: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    is_track: number;
    @Column({ type: 'int', nullable: false })
    schedule_id: number;
    @Column({ type: 'int', nullable: false })
    org_id: number;
    @Column({ type: 'int', nullable: false, default: 1 })
    status: number;
    @Column({ type: 'int', nullable: false })
    created_by: number;
    @Column({ type: 'int', nullable: false })
    updated_by: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: null, onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
