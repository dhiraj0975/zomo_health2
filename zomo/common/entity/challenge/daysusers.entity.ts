import { Buffer } from 'buffer';
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
@Entity({ name: tableConstant.CHALLENGE.TBL_CH_DAYS_USERS })
export class DaysUsersEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: true, default: null })
    schedule_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    user_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    week_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    day_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    activity_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    challenge_id: number;
    @Column({ type: 'mediumtext', nullable: true, default: null })
    site_activity_desc: string;
    @Column({ type: 'mediumtext', nullable: true, default: null })
    manual_activity: string;
    @Column({ type: 'mediumtext', nullable: true, default: null })
    manual_desc: string;
    @Column({ type: 'text', nullable: true, default: null })
    completion_status: string;
    @Column({ type: 'text', nullable: true, default: null })
    log_status: string;
    @Column({ type: 'int', nullable: false, default: 0 })
    linkstatus: number;
    @Column({ type: 'varchar', length: 50, nullable: true, default: null })
    meal: string;
    @Column({ type: 'text', nullable: true, default: null })
    amount: string;
    @Column({ type: 'text', nullable: true, default: null })
    quantity: string;
    @Column({ type: 'varchar', length: 50, nullable: true, default: null })
    steps: string;
    @Column({ type: 'varchar', length: 50, nullable: true, default: null })
    duration: string;
    @Column({ type: 'varchar', length: 50, nullable: true, default: null })
    distance: string;
    @Column({ type: 'varchar', length: 50, nullable: true, default: null })
    calories: string;
    @Column({ type: 'varchar', length: 20, nullable: true, default: null })
    tabacco_status: string;
    @Column({ type: 'text', nullable: true, default: null })
    avalue: string;
    @Column({ type: 'varbinary', length: 100, nullable: true, default: null })
    waterlogunit: Buffer;
    @Column({ type: 'varchar', length: 100, nullable: true, default: null })
    m_numeric: string;
    @Column({ type: 'varchar', length: 255, nullable: true, default: null })
    m_short: string;
    @Column({ type: 'longtext', nullable: true, default: null})
    m_long: string;
    @Column({ type: 'varchar', length: 50, nullable: true, default: null })
    m_yesno: string;
    @Column({ type: 'varchar', length: 50, nullable: true, default: null })
    m_check: string;
    @Column({ type: 'mediumtext', nullable: true, default: null })
    m_field: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    start_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    end_date: string;
    @Column({ type: 'int', nullable: false, default: 0 })
    status: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    added_date: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: null, onUpdate: 'CURRENT_TIMESTAMP' })
    update_date: Date;
}
