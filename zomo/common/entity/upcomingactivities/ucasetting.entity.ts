import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
;
;
@Entity(tableConstant.UPCOMING_ACTIVITIES.TBL_UCA_SETTING)
export class UcaSettingEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: true, default: null })
    org_id: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    events:  number;
    @Column({ type: 'int', nullable: true, default: 0 })
    challenges:  number;
    @Column({ type: 'int', nullable: true, default: 0 })
    manual_entry:  number;
    @Column({ type: 'int', nullable: true, default: 0 })
    incentive:  number;
    @Column({ type: 'int', nullable: true, default: 0 })
    future_plan:  number;
    @Column({ type: 'int', default: 1 })
    timeline:  number;
    @Column({ type: 'int', nullable: true, default: 1 })
    status:  number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
