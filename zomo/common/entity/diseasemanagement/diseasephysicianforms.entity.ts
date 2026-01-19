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
@Entity({ name: tableConstant.DISEASE_MANAGEMENT.TBL_DS_PHYSICIAN_FORMS })
export class DiseasePhysicianFormsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int' })
    user_id: number;
    @Column({ type: 'int' })
    activity_id: number;
    @Column({ type: 'int' })
    physician_id: number;
    @Column({ type: 'varchar', length: 250 })
    disease_formid: string;
    @Column({ type: 'text', nullable: true })
    standard_ids: string;
    @Column({ type: 'text', nullable: true })
    standard_dates: string;
    @Column({ type: 'text', nullable: true })
    not_recommended: string;
    @Column()
    date_completed: Date;
    @Column({ type: 'varchar', length: 250 })
    signature: string;
    @Column({ type: 'int', default: 1 })
    is_signed: number;
    @Column({ type: 'int', default: 1 })
    status: number;
    @Column({ type: 'int', default: 0 })
    deleted: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
