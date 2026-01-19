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
@Entity({ name: tableConstant.CHALLENGE.TBL_CH_HEALTH_USERS_ACTIVITY })
export class HealthUsersActivityEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: false })
    act_id: number;
    @Column({ type: 'int', nullable: false })
    org_id: number;
    @Column({ type: 'int', nullable: false })
    user_id: number;
    @Column({ type: 'int', nullable: false })
    miles: number;
    @Column({ type: 'datetime', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
    act_date: Date;
    @Column({ type: 'int', nullable: false, default: 1 })
    status: number;
    @Column({ type: 'int', nullable: false })
    created_by: number;
    @Column({ type: 'int', nullable: false })
    updated_by: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: null, onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
