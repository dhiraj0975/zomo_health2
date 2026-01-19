import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
;
;
@Entity({ name: tableConstant.DATA_MANAGEMENT.TBL_DM_IMPORT_HISTORIES })
export class DataManagementImportHistoriesEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('varchar',{ length: 255, nullable: false })
    filename: string;
    @Column('varchar',{ length: 255, nullable: false })
    tablename: string;
    @Column('varchar',{ length: 255, nullable: false })
    object_name: string;
    @Column('integer',{ nullable: false})
    oktodelete: number;
    @Column('varchar',{ length: 255, nullable: false })
    crud_status: string;
    @Column('varchar',{ length: 255, nullable: false })
    recordcount: string;
    @Column('integer',{ nullable: false})
    company_id: number;
    @Column({ type: 'int', default: 0 })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
}
