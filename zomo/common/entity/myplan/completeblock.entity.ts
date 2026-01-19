import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';
import { tableConstant } from '../../constant';
;
;
@Entity(tableConstant.MY_PLAN.TBL_MP_COMPLETE_BLOCK)
export class MyPlanCompleteBlockEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Index()
    @Column({ type: 'int' })
    plan_id: number;
    @Column({ type: 'int' })
    block_id: number;
    @Column({ type: 'int' })
    activity_id: number;
    @Index()
    @Column({ type: 'int' })
    user_id: number;
    @Column({ type: 'text', nullable: true, default: null })
    activity_detail: string;
    @Column({ type: 'int', nullable: false, default: 1 })
    status: number;
    @Index()
    @Column('datetime', { nullable: true, default: () => 'CURRENT_TIMESTAMP'  })
    complete_date: Date;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
