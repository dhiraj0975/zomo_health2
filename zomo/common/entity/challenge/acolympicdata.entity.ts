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
@Entity({ name: tableConstant.CHALLENGE.TBL_CH_AC_OLYMPIC_DATA })
export class AcOlympicDataEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: true, default: null })
    user_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    schedule_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    activity_id: number;
    @Column({ type: 'text', nullable: true, default: null })
    activity_cus_desc: string;
    @Column({ type: 'int', nullable: true, default: null })
    minutes: number;
    @Column({ type: 'datetime', nullable: true, default: null })
    added_date: Date;
    @Column({ type: 'int', nullable: true, default: null })
    status: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ type: 'timestamp', onUpdate: 'CURRENT_TIMESTAMP', nullable: true, default: null })
    update_date: Date;
}
