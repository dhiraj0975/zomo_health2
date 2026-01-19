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
@Entity({ name: tableConstant.CHALLENGE.TBL_CH_TEAMS })
export class TeamsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: false })
    group_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    schedule_id: number;
    @Column({ type: 'varchar', length: 255, nullable: true, default: null })
    tname: string;
    @Column({ type: 'varchar', length: 255, nullable: true, default: null })
    logo: string;
    @Column({ type: 'int', nullable: true, default: null })
    org_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    team_size: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    dept_id: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    loc_id: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    dept_with_loc_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    created_by: number;
    @Column({ type: 'int', nullable: true, default: null })
    status: number;
    @CreateDateColumn({ type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: null, onUpdate: 'CURRENT_TIMESTAMP' })
    updated_date: Date;
}
