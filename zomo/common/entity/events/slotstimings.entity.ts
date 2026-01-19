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
@Entity({ name: tableConstant.EVENTS.TBL_EV_SLOTS_TIMINGS })
export class EventSlotsTimingsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int' })
    ev_events_id: number;
    @Column({ type: 'int' })
    ev_slots_id: number;
    @Column({ type: 'date' })
    slotdate: string;
    @Column({ type: 'time' })
    slotstarttime: string;
    @Column({ type: 'time' })
    slotendtime: string;
    @Column({ type: 'varchar', length: 10,nullable: true })
    slotinterval: string;
    @Column('integer', { nullable: true, default: 0 })
    total_booked: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @Column('integer', { nullable: true, default: 0 })
    created_by: number;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    modified: Date;
    @Column('integer', { nullable: true, default: 1 })
    status: number;
}
