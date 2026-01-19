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
@Entity({ name: tableConstant.TRACKERS.TBL_FT_BODY_FEEDS })
export class BodyFeedsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: true })
    user_id: number;
    @Column({ type: 'varchar', length: 250, nullable: true,})
    userName: string;
    @Column({ type: 'varchar', length: 100, nullable: true,})
    appId: string;
    @Column({ type: 'varchar', length: 20, nullable: true,})
    logType: string;
    @Column({ type: 'varchar', length: 50, nullable: true,})
    appName: string;
    @Column({ type: 'varchar', length: 50, nullable: true,})
    measurementUnit: string;
    @Column({ type: 'varchar', length: 100, nullable: true,})
    age: string;
    @Column({ type: 'float', precision: 8, scale: 2, nullable: true })
    weight: number;
    @Column({ type: 'float', precision: 8, scale: 2, nullable: true })
    chest: number;
    @Column({ type: 'float', precision: 8, scale: 2, nullable: true })
    abdominal: number;
    @Column({ type: 'float', precision: 8, scale: 2, nullable: true })
    thigh: number;
    @Column({ type: 'float', precision: 8, scale: 2, nullable: true })
    tricep: number;
    @Column({ type: 'float', precision: 8, scale: 2, nullable: true })
    subscapular: number;
    @Column({ type: 'float', precision: 8, scale: 2, nullable: true })
    suprailiac: number;
    @Column({ type: 'float', precision: 8, scale: 2, nullable: true })
    midaxillary: number;
    @Column({ type: 'varchar', length: 20, nullable: true,})
    method: string;
    @Column({ type: 'datetime', nullable: true })
    date: Date;
    @Column({ type: 'int', default: 1 })
    status: number;
    @CreateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    added_date: Date;
    @CreateDateColumn({ type: 'timestamp', default: null, onUpdate: 'CURRENT_TIMESTAMP' })
    updated_date: Date;
}
