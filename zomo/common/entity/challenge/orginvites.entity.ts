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
@Entity({ name: tableConstant.CHALLENGE.TBL_CH_ORG_INVITES })
export class OrgInvitesEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: true, default: null })
    challenge_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    org_id: number;
    @Column({ type: 'datetime', nullable: true, default: null })
    start_date: Date;
    @Column({ type: 'datetime', nullable: true, default: null })
    end_date: Date;
    @Column({ type: 'int', nullable: true, default: 1 })
    status: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    added_date: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: null, onUpdate: 'CURRENT_TIMESTAMP' })
    updated_date: Date;
}
