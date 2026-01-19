import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
;
@Entity(tableConstant.TBL_USERS_NOTIFICATIONS)
export class UserNotificationEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', default: 0 })
    org_id: number;
    @Column({ type: 'bigint' })
    user_id: number;
    @Column({ type: 'varchar', length: 255 })
    title: string;
    @Column({ type: 'text' })
    message: string;
    @Column('integer')
    type: number;
    @Column({ type: 'varchar', length: 100 })
    module_name: string;
    @Column({ type: 'varchar', length: 100, nullable: true })
    submodule_name?: string;
    @Column('integer', { default: 0 })
    is_read: number;
    @Column({ type: 'json', nullable: true })
    metadata?: Record<string, any>;
    @Column('integer', { default: 1 })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;
}
