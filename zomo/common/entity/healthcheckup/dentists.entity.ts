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
@Entity({ name: tableConstant.HEALTH_CHECKUP.TBL_HC_DENTISTS })
export class DentistsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Index()
    @Column({ type:  'int', nullable: true, default: null })
    userid: number;
    @Index()
    @Column({ type:  'int', nullable: true, default: null })
    activity_id: number;
    @Column({ type:  'int', nullable: true, default: null })
    physician_id: number;
    @Index()
    @Column({ type: 'datetime', nullable: true, default: null })
    date_completed: Date;
    @Column({ type: 'varchar', length: 255, nullable: true, default: null })
    signature: string;
    @Column({ type:  'int', nullable: true, default: null })
    is_signed: number;
    @Column({ type:  'int', nullable: true, default: null })
    enter_by: number;
    @Column({ type: 'int', default: 1 })
    status: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    inserted: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
