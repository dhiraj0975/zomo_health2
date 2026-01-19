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
@Entity({ name: tableConstant.REIMBURSEMENT.TBL_RE_CREATE_FORMS })
export class ReimbursementCreateFormsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'varchar', length: 250 })
    title: string;
    @Column({ type: 'int' })
    org_id: number;
    @Column({ type: 'varchar', length: 250 })
    activity_id: string;
    @Column({ type: 'int' })
    activity_date: number;
    @Column({ type: 'int' })
    attachments: number;
    @Column({ type: 'int' })
    attachment_req: number;
    @Column({ type: 'int' })
    multiple_selection: number;
    @Column({ type: 'varchar', length: 255 })
    description: string;
    @Column({ type: 'int', default: 0 })
    act_reim_amount: number;
    @Column({ type: 'int' })
    approval_type: number;
    @Column({ type: 'int' })
    created_by: number;
    @Column({ type: 'int' })
    status: number;
    @Column({ type: 'int', default: 0  })
    deleted: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    added_date: Date;
    @UpdateDateColumn({ type: 'timestamp', onUpdate: 'CURRENT_TIMESTAMP', nullable: true, default: null })
    updated_date: Date;
}
