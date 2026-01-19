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
@Entity({ name: tableConstant.HEALTH_CHECKUP.TBL_HC_TOBACCO_USES })
export class TobaccoUsesEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Index()
    @Column({ type: 'int' })
    user_id: number;
    @Index()
    @Column({ type: 'int' })
    activity_id: number;
    @Column({ type: 'int' })
    is_tobacco_user: number;
    @Column({ type: 'varchar', length: 100 })
    signature: string;
    @Column({ type: 'varchar', length: 100 })
    type_of_form: string;
    @Column({type: 'varchar', length: 256, nullable: true, default: null })
    user_sign_image: string;
    @Index()
    @Column({ type: 'datetime', nullable: true, default: null })
    date_completed: Date;
    @Column({ type: 'int', default: 0 })
    generated_by: number;
    @Column({ type: 'int', default: 1 })
    status: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
