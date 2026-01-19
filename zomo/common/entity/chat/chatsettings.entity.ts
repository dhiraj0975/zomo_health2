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
@Entity({ name: tableConstant.CHALLENGE.TBL_CH_CHAT_SETTINGS })
export class ChatSettingsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: true, default: null })
    org_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    user_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    chat_with_dept: number;
    @Column({ type: 'int', nullable: true, default: null })
    chat_with_loc: number;
    @Column({ type: 'int', nullable: true, default: null })
    chat_with_users: number;
    @Column({ type: 'int', nullable: true, default: null })
    chat_with_team: number;
    @Column({ type: 'int', nullable: true, default: null })
    chat_own_team: number;
    @Column({ type: 'int', nullable: true, default: null })
    status: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    added_date: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: null, onUpdate: 'CURRENT_TIMESTAMP' })
    update_date: Date;
}
