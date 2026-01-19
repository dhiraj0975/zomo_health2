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
@Entity(tableConstant.QUICK_LINK.TBL_QUICK_LINK)
export class QuickLinkEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ name: 'c_companies_id', type: 'int', nullable: true })
    c_companies_id: number;
    @Column({ name: 'folder_id',  type: 'int', nullable: true, default: null })
    folder_id: number;
    @Column({ name: 'title',  type: 'text', nullable: true })
    title: string;
    @Column({ name: 'description', type: 'text', nullable: true })
    description: string;
    @Column({ name: 'link', type: 'text', nullable: true })
    link: string;
    @Column({ name: 'sort_order', type: 'int', nullable: true })
    sort_order: number;
    @Column({ name: 'is_video', type: 'int', nullable: true, default: 0 })
    is_video: number;
    @Column({ name: 'activity_id', type: 'int', nullable: true, default: 0 })
    activity_id: number;
    @Column({ name: 'eligibility', type: 'int', nullable: true, default: 0 })
    eligibility:  number;
    @Column({ name: 'status', type: 'tinyint', nullable: true })
    status:  number;
    @Column({ name: 'healthplanname', type: 'text', nullable: true, default: null })
    healthplanname:  string;
    @Column({ name: 'usernotonhealthplan', type: 'int', nullable: true, default: 0 })
    usernotonhealthplan:  number;
    @Column({ name: 'dispalybasedon', type: 'int', nullable: true, default: 0 })
    dispalybasedon:  number;
    @Column({ name: 'fromdate', type: 'datetime', nullable: true, default: null })
    fromdate:  Date;
    @Column({ name: 'todate', type: 'datetime', nullable: true, default: null })
    todate:  Date;
    @Column({ name: 'created_by', type: 'int', nullable: true })
    created_by:  number;
    @Column({ name: 'updated_by', type: 'int', nullable: true })
    updated_by:  number;
    @CreateDateColumn({ name: 'created', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ name: 'modified', type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    modified: Date;
}
