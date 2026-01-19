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
@Entity(tableConstant.QUICK_LINK.TBL_QUICK_LINK_FOLDERS)
export class QuickLinkFoldersEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'varchar', length: 500, nullable: true })
    folder_name: string;
    @Column({ type: 'int', nullable: true })
    c_companies_id: number;
    @Column({ type: 'int', nullable: true, default: 1 })
    status: number;
    @Column({ type: 'text', nullable: true, default: null })
    healthplanname: string;
    @Column({ type: 'int', nullable: true, default: 0 })
    usernotonhealthplan: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    global_folder: number;
    @Column({ type: 'int', nullable: true, default: null })
    created_by: number;
    @Column({ type: 'int', nullable: true, default: null })
    updated_by: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
