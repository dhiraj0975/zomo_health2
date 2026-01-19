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
@Entity(tableConstant.MY_PLAN.TBL_MP_BLOCKS)
export class MyPlanBlocksEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'varchar', length: 256 })
    name: string;
    @Column({ type: 'text', nullable: true, default: null })
    icon: string;
    @Column({ type: 'text' })
    description: string;
    @Column({ type: 'int' })
    plan_id: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    order_id: number;
    @Column({ type: 'int', nullable: false, default: 1 })
    status: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
