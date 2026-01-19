import { tableConstant } from '@common-constants';
import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
} from 'typeorm';
@Entity({ name: tableConstant.TRACKERS.TBL_FT_AUTHORIZED_USERS })
export class FtAuthorizedUsersEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int' })
    user_id: number;
    @Column({ type: 'varchar', length: 255,})
    username: string;
    @Column({ type: 'varchar', length: 10, default: 'NA' })
    statusFB: string;
    @Column({ type: 'varchar', length: 255, })
    consumer_key: string;
    @Column({ type: 'varchar', length: 255, })
    consumer_secret: string;
    @Column({ type: 'text', })
    token_key: string;
    @Column({ type: 'text', })
    token_secret: string;
    @Column({ type: 'varchar', length: 200, })
    app_name: string;
    @Column({ type: 'varchar', length: 255, })
    app_id: string;
    @Column({ type: 'varchar', length: 100, })
    user_timezone: string;
    @Column({ type: 'int', default: 1 })
    status: number;
    @Column({ type: 'int', default: 1, comment: '1 - FitBit, 2 - Garmin, 3 - Jawbone' })
    device_id: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    date_time: Date;
}
