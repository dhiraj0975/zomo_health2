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
@Entity({ name: tableConstant.CHALLENGE.TBL_CH_CHAT })
export class ChatEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: true, default: null })
    org_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    user_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    group_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    schedule_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    location_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    department_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    team_id: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    event_id: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    is_private: number;
    @Column({ type: 'int', nullable: true, default: null })
    sender_id: number;
    @Column({ type: 'text', nullable: true, default: null })
    text: string;
    @Column({ type: 'text', nullable: true, default: null })
    read_by: string;
    @Column('json', { nullable: true })
    reactions: any;
    @Column({ type: 'int', default: 1 })
    status: number;
    @CreateDateColumn({ type: 'varchar'})
    added_date: string;
    @UpdateDateColumn({ type: 'varchar', nullable: true, default: null})
    datetime: string;
}
