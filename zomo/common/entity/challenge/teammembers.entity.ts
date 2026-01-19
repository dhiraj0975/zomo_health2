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
@Entity({ name: tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS })
export class TeamMembersEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: true, default: null})
    team_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    org_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    user_id: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    user_order: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    iscaptain: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    baton_status: number;
    @Column({ type: 'varchar', nullable: false, default: () => "'0000-00-00 00:00:00'" })
    baton_start: string;
    @Column({ type: 'int', nullable: true, default: 1 })
    status: number;
    @CreateDateColumn({ type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: null, onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
