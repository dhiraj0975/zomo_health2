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
@Entity({ name: tableConstant.DATA_MANAGEMENT.TBL_DM_IMPORT_HISTORY_COLUMNS })
export class DataManagementImportHistoryColumnsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('varchar',{ length: 255, nullable: false })
    csv_columnname: string;
    @Column('varchar',{ length: 255, nullable: false })
    mapcolumnname: string;
    @Column('varchar',{ length: 255, nullable: false })
    position: string;
    @Column('varchar',{ length: 255, nullable: false })
    validationrulesid: string;
    @Column('integer',{ nullable: false})
    dm_import_history_id: number;
    @Column({ type: 'int', default: 1 })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
}
