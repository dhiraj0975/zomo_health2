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
@Entity({ name: tableConstant.CHALLENGE.TBL_CH_CARDS })
export class CardsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: false })
    schedule_id: number;
    @Column({ type: 'int', nullable: false })
    org_id: number;
    @Column({ type: 'varchar', length: 256, nullable: false })
    name: string;
    @Column({ type: 'text', nullable: false })
    description: string;
    @Column({ type: 'int', nullable: false, default: 0 })
    parent_id: number;
    @Column({ type: 'int', nullable: false })
    order_no: number;
    @Column({ type: 'int', nullable: false })
    status: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: null, onUpdate: 'CURRENT_TIMESTAMP' })
    modified_date: Date;
}
