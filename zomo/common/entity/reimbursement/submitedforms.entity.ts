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
@Entity({ name: tableConstant.REIMBURSEMENT.TBL_RE_SUBMITTED_FORMS })
export class ReimbursementSubmitedFormsEntity extends BaseEntity {
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
    @Column({ type: 'varchar', default: () => 'CURRENT_TIMESTAMP' })
    activity_date: Date;
    @Column({ type: 'varchar', length: 250 })
    attachments: string;
    @Column({ type: 'int', default: 0 })
    reim_amount: number;
    @Column({ type: 'text', nullable: true })
    notes: string;
    @Column({ type: 'text', nullable: true })
    decline_reason: string;
    @Column({ type: 'int', default: 0, comment: '0=hide,1=show' })
    popup_status: number;
    @Column({ type: 'int', default: 0 })
    approve_reim_amount: number;
    @Column({ type: 'int' })
    approval_type: number;
    @Column({ type: 'int' })
    status: number;
    @Column({ type: 'int' })
    deleted: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    added_date: Date;
    @UpdateDateColumn({ type: 'timestamp', onUpdate: 'CURRENT_TIMESTAMP', nullable: true, default: null })
    updated_date: Date;
}
