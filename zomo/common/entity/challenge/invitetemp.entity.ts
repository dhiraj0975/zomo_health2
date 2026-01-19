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
@Entity({ name: tableConstant.CHALLENGE.TBL_CH_INVITE_TEMP })
export class InviteTempEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: true, default: null })
    user_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    org_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    schedule_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    added_by: number;
    @Column({ type: 'int', nullable: true, default: null })
    status: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    added_date: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: null, onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
