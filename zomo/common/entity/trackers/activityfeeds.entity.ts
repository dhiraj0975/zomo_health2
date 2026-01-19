import {
    BaseEntity,
    Column,
    Entity,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
@Entity({ name: tableConstant.TRACKERS.TBL_FT_ACTIVITY_FEEDS })
export class ActivityFeedsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    acId: number;
    @Column({ type: 'int' })
    user_id: number;
    @Column({ type: 'varchar', length: 250, })
    userName: string;
    @Column({ type: 'varchar', length: 100, })
    appId: string;
    @Column({ type: 'varchar', length: 20, })
    logType: string;
    @Column({ type: 'varchar', length: 50, })
    appName: string;
    @Column({ type: 'int' })
    activityId: number;
    @Column({ type: 'int' })
    parentId: number;
    @Column({ type: 'varchar', length: 250, })
    parentName: string;
    @Column({ type: 'varchar', length: 250, })
    activityName: string;
    @Column({ type: 'int' })
    calories: number;
    @Column({ type: 'float', precision: 10, scale: 2 })
    distance: number;
    @Column({ type: 'int' })
    steps: number;
    @Column({ type: 'bigint' })
    duration: number;
    @Column({ type: 'varchar', length: 20, })
    hasStartTime: string;
    @Column({ type: 'varchar', length: 20, })
    isFavorite: string;
    @Column({ type: 'int' })
    logId: number;
    @Column({ type: 'varchar', length: 50, })
    startTime: string;
    @Column({ type: 'varchar', length: 10, })
    timeFormat: string;
    @Column({ type: 'text', })
    description: string;
    @Column({ type: 'int' })
    activityTypeId: number;
    @Column({ type: 'varchar', length: 250, })
    activityType: string;
    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    timestamp: Date;
    @Column({ type: 'varchar' })
    collectionDate: string;
    @Column({ type: 'varchar', length: 50, nullable: true })
    timezone: string;
    @Column({ type: 'int', default: 1 })
    status: number;
}
