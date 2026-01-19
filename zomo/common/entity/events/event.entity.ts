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
@Entity({ name: tableConstant.EVENTS.TBL_EV_EVENTS })
export class EventEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: false})
    created_by_user_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    category_id: number;
    @Column({ type: 'varchar', length: 255, nullable: false })
    event_name: string;
    @Column({ type: 'longtext', nullable: false })
    event_description: string;
    @Column({ type: 'int', nullable: true, default: null })
    event_timezone: number;
    @Column({ type: 'varchar', length: 255, nullable: true, default: null })
    event_location: string;
    @Column({ type: 'varchar', length: 255, nullable: true, default: null })
    event_address: string;
    @Column({ type: 'varchar', length: 30, nullable: true, default: null })
    event_city: string;
    @Column({ type: 'varchar', length: 30, nullable: true, default: null })
    event_state: string;
    @Column({ type: 'varchar', length: 30, nullable: true, default: null })
    event_zipcode: string;
    @Column({ type: 'float', nullable: true, default: null })
    booking_price: number;
    @Column({ type: 'varchar', length: 255, nullable: false })
    user_id: string;
    @Column({ type: 'varchar', length: 255, nullable: false })
    user_email: string;
    @Column({ type: 'int', nullable: false, default: 0 })
    signup_more_time: number;
    @Column({ type: 'int', nullable: false, default: 1 })
    register_count: number;
    @Column({ type: 'tinyint', nullable: false })
    status: number;
    @Column({ type: 'date', nullable: true, default: null })
    start_date: string;
    @Column({ type: 'date', nullable: true, default: null })
    end_date: string;
    @CreateDateColumn({ type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    modified: Date;
    @Column({ type: 'int', nullable: false })
    organization_id : number;
    @Column({ type: 'varchar', length: 50, nullable: true, default: null })
    all_locations: string;
    @Column({ type: 'varchar', length: 50, nullable: true, default: null })
    all_departments: string;
    @Column({ type: "int", nullable: true, default: null })
    sync_locations: number;
    @Column({ type: "int", nullable: true, default: null })
    sync_departments: number;
    @Column({ type: "int", nullable: true, default: null })
    activity_id: number;
    @Column({ type: "int", nullable: false, default: 0 })
    orderid: number;
    @Column({ type: "text", nullable: true, default: null })
    subject: string;
    @Column({ type: "text", nullable: true, default: null })
    message: string;
    @Column({ type: 'varchar', length: 256, default: '' })
    reminder: string;
    @Column({ type: 'int', nullable: true, default: null })
    reminder_limit: number;
    @Column({ type: 'text', nullable: true, default: null })
    ics_message: string;
    @Column({ type: 'int', nullable: false, default: 0 })
    eligibility: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    event_type: number;
    @Column({ type: 'varchar', length: 500, nullable: true, default: null })
    external_link: string;
    @Column({ type: 'int', nullable: null, default: 0 })
    tot_register: number;
    @Column({ type: 'longtext', nullable: true, default: null })
    healthplanname: string;
}
