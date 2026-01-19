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
@Entity({ name: tableConstant.ACTIVITY_TRACKER.TBL_SUBMITTED_FORMS })
export class SubmitedFormsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int' })
    user_id: number;
    @Column({ type: 'int' })
    org_id: number;
    @Column({ type: 'int' })
    form_id: number;
    @Column({ type: 'int' })
    activity_id: number;
    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    activity_date: Date;
    @Column({ type: 'varchar', length: 250 })
    attachments: string;
    @Column({ type: 'text' })
    notes: string;
    @Column({ type: 'text', nullable: true })
    decline_reason: string;
    @Column({ type: 'int', default: 0, comment:'0=hide,1=show' })
    popup_status: number;
    @Column({ type: 'int' })
    approval_type: number;
    @Column({ type: 'int', default: 0 })
    status: number;
    @Column({ type: 'int', default: 0 })
    deleted: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    added_date: Date;
    @UpdateDateColumn({ type: 'timestamp', onUpdate: 'CURRENT_TIMESTAMP', nullable: true, default: null })
    updated_date: Date;
}
