import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
;
;
@Entity(tableConstant.QUICK_LINK.TBL_QUICK_LINK_FOLDERS_ORGLISTS)
export class QuickLinkFolderOrgListsEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int' })
    c_companies_id: number;
    @Column({ type: 'int' })
    folder_id: number;
    @Column({ type: 'int', nullable: true, default: 1 })
    status: number;
    @Column({ type: 'int', nullable: true, default: null })
    created_by: number;
    @Column({ type: 'int', nullable: true, default: null })
    updated_by: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    update: Date;
}
