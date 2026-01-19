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
@Entity({ name: tableConstant.EVENTS.TBL_EV_REMINDERS })
export class EventRemindersEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int' })
    ev_events_id: number;
    @Column({ type: 'int' })
    ev_slots_id: number;
    @Column({ type: 'varchar', length: 255 })
    reminder_name: string;
    @Column({ type: 'date' })
    reminder_date: number;
    @Column({ type: 'time' })
    reminder_time: number;
    @Column({ type: 'int' })
    reminder_timezone: number;
    @Column({ type: 'varchar', length: 255 })
    reminder_subject: string;
    @Column({ type: 'longtext' })
    reminder_message: string;
    @Column({ type: 'tinyint' })
    status: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    modified: Date;
}
