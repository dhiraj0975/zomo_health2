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
@Entity({ name: tableConstant.EVENTS.TBL_EV_USER_BOOKING_LISTS })
export class EventUserBookingListsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int' })
    organization_id: number;
    @Column({ type: 'int' })
    ev_events_id: number;
    @Column({ type: 'int' })
    ev_slots_id: number;
    @Column({ type: 'int' })
    ev_user_id: number;
    @Column({ type: 'varchar', length: 30 })
    ev_extension: string;
    @Column({ type: 'varchar', length: 30 })
    ev_contact: string;
    @Column({ type: 'datetime' })
    registration_date: string;
    @Column('integer', { nullable: false, default: 0 })
    ev_attend_status: number;
    @Column('integer', { nullable: true, default: null })
    attend_by: number;
    @Column({ type: 'datetime' })
    attend_date: Date;
    @Column({ type: 'tinyint' })
    status: number;
    @Column({ type: 'varchar', length: 155 })
    slot_selected: string;
    @Column({ type: 'int', nullable: true, default: null })
    activity_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    reminder_limit: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    lang_id: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    modified: Date;
}
