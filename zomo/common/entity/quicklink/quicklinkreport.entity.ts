import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
@Entity(tableConstant.REPORT.TBL_QUICK_LINK_REPORT)
export class QuickLinkReportEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: true })
    org_id: number;
    @Column({ type: 'int', nullable: true })
    user_id: number;
    @Column({ type: 'varchar', length: 256, nullable: true })
    membership_code: string;
    @Column({ type: 'text', nullable: true })
    condition: string;
    @Column({ type: 'text', nullable: true })
    file_name: string;
    @Column({ type: 'varchar', length: 51, nullable: true ,default: 0})
    total_download: string;
    @Column({ type: 'datetime', nullable: true })
    request_date: Date;
    @Column({ type: 'int', nullable: true })
    status: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated_date: Date;
}
