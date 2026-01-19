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
@Entity({ name: tableConstant.DISEASE_MANAGEMENT.TBL_DS_MANAGE_DISEASE })
export class ManageDiseaseEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int' })
    disease_id: number;
    @Column({ type: 'int' })
    company_id: number;
    @Column({ type: 'datetime' })
    start_date: Date;
    @Column({ type: 'datetime' })
    end_date: Date;
    @Column({ type: 'datetime' })
    fax_date: Date;
    @Column({ type: 'text', })
    disease_form_ids: string;
    @Column({ type: 'text', })
    coverpage_text: string;
    @Column({ type: 'text', })
    instructions_text: string;
    @Column({ type: 'int', default: 0 })
    deleted: number;
    @Column({ type: 'int', default: 0 })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
