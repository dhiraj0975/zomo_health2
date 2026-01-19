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
@Entity({ name: tableConstant.DATA_MANAGEMENT.TBL_DMT_DOCUMENT })
export class DataManagementDocumentEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('varchar',{ length: 500 })
    title: string;
    @Column('varchar',{ length: 500 })
    doc_name: string;
    @Column('integer')
    organization_id: number;
    @Column({ type: 'text', nullable: true })
    description: string;
    @Column('integer')
    is_global: number;
    @Column('integer')
    is_login: number;
    @Column({ type: 'int', default: 0 })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @Column('integer',{ default: 0 })
    created_by: number;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    modified: Date;
}
