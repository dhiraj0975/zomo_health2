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
@Entity({ name: tableConstant.DISEASE_MANAGEMENT.TBL_DS_DISEASES })
export class DiseasesEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('varchar',{ length: 255 })
    title: string;
    @Column({ type: 'text', nullable: true })
    desc: string;
    @Column('varchar',{ length: 255 })
    forms_order: string;
    @Column('integer', { nullable: true })
    weight: number;
    @Column({ type: 'int', default: 0 })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
