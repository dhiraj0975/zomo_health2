import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
@Entity({ name: tableConstant.HEALTH_CHECKUP.TBL_HC_OPTOMETRISTS })
export class OptometristsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Index()
    @Column({ type: 'int', nullable: true })
    userid: number;
    @Index()
    @Column({ type: 'int', nullable: true })
    activity_id: number;
    @Column({ type: 'int', nullable: true })
    physician_id: number;
    @Index()
    @Column({ type: 'varchar', length: 255, nullable: true, default: null})
    date_completed: string;
    @Column({ type: 'varchar', length: 255, nullable: true })
    signature: string;
    @Column({ type: 'int', nullable: true })
    is_signed: number;
    @Column({ type: 'int', nullable: true })
    enter_by: number;
    @Column({ type: 'int', default: 1 })
    status: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    inserted: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
