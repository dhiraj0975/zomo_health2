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
@Entity({ name: tableConstant.CHALLENGE.TBL_CH_WEEKS })
export class WeeksEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: true, default: null })
    challenge_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    activity_id: number;
    @Column({ type: 'text', nullable: true, default: null })
    site_activity_desc: string;
    @Column({ type: 'text', nullable: true, default: null })
    manual_activity: string;
    @Column({ type: 'text', nullable: true, default: null })
    manual_desc: string;
    @Column({ type: 'int', nullable: true, default: 1 })
    completion_status: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    log_status: number;
    @Column({ type: 'varchar', length: 50, nullable: true, default: null })
    meal: string;
    @Column({ type: 'int', nullable: true, default: null })
    amount: number;
    @Column({ type: 'int', nullable: true, default: null })
    quantity: number;
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
    @Column({ type: 'int', nullable: true, default: null })
    avalue: number;
    @Column({ type: 'varbinary', length: 100, nullable: true, default: null })
    waterlogunit: Buffer;
    @Column({ type: 'varchar', length: 100, nullable: true, default: null })
    m_numeric: string;
    @Column({ type: 'varchar', length: 255, nullable: true, default: null })
    m_short: string;
    @Column({ type: 'longtext', nullable: true, default: null })
    m_long: string;
    @Column({ type: 'varchar', length: 50, nullable: true, default: null })
    m_yesno: string;
    @Column({ type: 'varchar', length: 50, nullable: true, default: null })
    m_check: string;
    @Column({ type: 'text', nullable: true, default: null })
    m_field: string;
    @Column({ type: 'varchar', length: 500, nullable: true, default: null })
    logofile: string;
    @Column({ type: 'int', nullable: false, default: 1 })
    status: number;
    @Column({ type: 'text', nullable: true, default: null })
    tabmanual: string;
    @CreateDateColumn({ type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
    added_date: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: null, onUpdate: 'CURRENT_TIMESTAMP' })
    update_date: Date;
}
