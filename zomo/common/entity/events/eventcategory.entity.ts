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
@Entity({ name: tableConstant.EVENTS.TBL_EV_EVENT_CATEGORY })
export class EventCategoryEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'text' })
    category_name: string;
    @Column({ type: 'text' })
    c_companies_id: number;
    @Column({ type: 'text', default: 0 })
    order_no: number;
    @Column({ type: 'text', default: 1 })
    status: number;
    @Column({ type: 'text', default: 0 })
    created_by: number;
    @Column({ type: 'text', default: 0 })
    updated_by: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
