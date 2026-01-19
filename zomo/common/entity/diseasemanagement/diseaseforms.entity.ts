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
@Entity({ name: tableConstant.DISEASE_MANAGEMENT.TBL_DS_FORMS })
export class DiseaseFormsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('varchar',{ length: 255 })
    code: string;
    @Column('varchar',{ length: 255 })
    title: string;
    @Column({ type: 'int' })
    disease_id: number;
    @Column({ type: 'text', nullable: true })
    coverpage_text: string;
    @Column({ type: 'text', nullable: true })
    instructions_text: string;
    @Column({ type: 'text', nullable: true })
    standard_id: string;
    @Column({ type: 'int', default: 0 })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
