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
@Entity(tableConstant.UPCOMING_ACTIVITIES.TBL_UCA_MANUAL_UP_COMINGS)
export class UcaManualUpComingsEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int'})
    org_id: number;
    @Column({ type: 'varchar' })
    title:  string;
    @Column({ type: 'text' })
    description:  string;
    @Column({ type: 'varchar', length: 255 })
    link:  string;
    @Column({ type: 'varchar' })
    start_date:  Date;
    @Column({ type: 'varchar' })
    end_date:  Date;
    @Column({ type: 'datetime', nullable: true, default: null })
    auto_remove_date:  Date;
    @Column({ type: 'int', nullable: true, default: 0 })
    displayoption: number;
    @Column({ type: 'tinyint', nullable: true })
    status: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    update_date: Date;
}
