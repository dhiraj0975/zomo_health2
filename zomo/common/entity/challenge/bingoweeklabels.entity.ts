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
@Entity({ name: tableConstant.CHALLENGE.TBL_CH_BINGO_WEEK_LABELS })
export class BingoWeekLabelsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: true, default: null})
    schedule_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    week_no: number;
    @Column({ type: 'text', nullable: true, default: null })
    week_custom_name: string;
    @Column({ type: 'int', default: 1 })
    status: number;
    @Column({ type: 'int', nullable: true, default: null })
    created_by: number;
    @Column({ type: 'int', nullable: true, default: null })
    updated_by: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: null, onUpdate: 'CURRENT_TIMESTAMP' })
    updated_date: Date;
}
