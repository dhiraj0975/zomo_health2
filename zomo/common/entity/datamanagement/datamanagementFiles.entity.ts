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
@Entity({ name: tableConstant.DATA_MANAGEMENT.TBL_DMT_FILES })
export class DataManagementFilesEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('varchar',{ length: 255 })
    title: string;
    @Column({ type: 'text', nullable: true })
    description: string;
    @Column('varchar',{ length: 255 })
    file_name: string;
    @Column('integer')
    is_global: number;
    @Column('integer')
    created_by: number;
    @Column('integer',{ default: 0 })
    modified_by: number;
    @Column({ type: 'int', default: 0 })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    modified: Date;
}
