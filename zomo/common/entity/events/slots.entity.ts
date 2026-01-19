import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
import { Enum } from '../../enum/enum';
;
@Entity({ name: tableConstant.EVENTS.TBL_EV_SLOTS })
export class EventSlotsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: false })
    ev_events_id: number;
    @Column({ type: 'int', nullable: false })
    organization_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    slot_timezone: number;
    @Column({ type: 'date', nullable: true, default: null })
    start_date: string;
    @Column({ type: 'date', nullable: true, default: null })
    end_date: string;
    @Column({ type: 'time', nullable: true, default: null })
    start_time: string;
    @Column({ type: 'time', nullable: true, default: null })
    end_time: string;
    @Column({ type: 'time', nullable: true, default: null })
    slot_hour: string;
    @Column({nullable: true, type: 'enum', enum: Enum, default: null })
    dividing_slot_type: Enum;
    @Column({ type: 'varchar', length: 50, nullable: true, default: null })
    slot_interval: string;
    @Column({ type: 'int', nullable: true, default: null })
    slot_total: number;
    @Column({nullable: true, type: 'enum', enum: Enum, default: null })
    attendee_limit_type: Enum;
    @Column({ type: 'int', nullable: true, default: null })
    attendee_limit: number;
    @Column({nullable: true, type: 'enum', enum: Enum, default: null })
    recurring_pattern_type: Enum;
    @Column({ type: 'varchar', length: 50,nullable: true, default: null })
    weekly_basis_day: string;
    @Column({ type: 'varchar', length: 256, nullable: true, default: null })
    weekly_basis_day_bio: string;
    @Column({nullable: true, type: 'enum', enum: Enum, default: null })
    monthly_basis: Enum;
    @Column({ type: 'varchar', length: 256, nullable: true, default: null })
    monthly_date_basis: string;
    @Column({ type: 'int', nullable: true, default: null })
    monthly_basis_Type: number;
    @Column({ type: 'int', nullable: true, default: null })
    monthly_basis_day: number;
    @Column({ type: 'int', nullable: true, default: null })
    year_basis_day: number;
    @Column({ type: 'int', nullable: true, default: null })
    year_basis_month: number;
    @Column({ type: 'text', nullable: true, default: null })
    slot_visibility_locations: string;
    @Column({ type: 'text', nullable: true, default: null })
    slot_visibility_departments: string;
    @Column({ type: 'varchar', length: 255, nullable: true, default: null })
    event_location: string;
    @Column({ type: 'varchar', length: 255, nullable: true, default: null })
    event_address: string;
    @Column({ type: 'varchar', length: 255, nullable: true, default: null })
    event_city: string;
    @Column({ type: 'varchar', length: 30, nullable: true, default: null })
    event_state: string;
    @Column({ type: 'varchar', length: 30, nullable: true, default: null })
    event_zipcode: string;
    @Column({ type: 'float', nullable: true, default: null })
    booking_price: number;
    @Column({ type: 'tinyint', nullable: true, default: null })
    status: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @Column({ type: 'int', nullable: true, default: 0 })
    created_by: number;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    modified: Date;
    @Column({ type: 'int' })
    registration_end: number;
}
