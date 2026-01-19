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
@Entity({ name: tableConstant.DISEASE_MANAGEMENT.TBL_DS_MANAGE_FORMS })
export class DiseaseManageFormsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int' })
    company_id: number;
    @Column({ type: 'text', nullable: true })
    disease_form_ids: string;
    @Column({ type: 'int', default: 1 })
    status: number;
    @Column({ type: 'int', default: 0 })
    deleted: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
