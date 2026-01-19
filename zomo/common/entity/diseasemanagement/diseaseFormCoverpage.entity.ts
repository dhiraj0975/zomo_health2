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
@Entity({ name: tableConstant.DISEASE_MANAGEMENT.TBL_DS_COVER_PAGES })
export class DiseaseFormCoverPagesEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int' })
    org_id: number;
    @Column({ type: 'int' })
    form_id: number;
    @Column({ type: 'text', nullable: true })
    coverpage_text: string;
    @Column({ type: 'int', default: 0 })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
