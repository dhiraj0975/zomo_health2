import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';
import { tableConstant } from '../../constant';
@Entity({ name: tableConstant.HEALTH_CHECKUP.TBL_HC_DOWNLOAD_FORMS })
export class DownloadFormsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: true, default: null })
    org_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    user_id: number;
    @Column({ type: 'varchar', length: 51, nullable: true, default: null })
    membership_code: string;
    @Column({ type: 'text', nullable: true, default: null })
    condition: string;
    @Column({ type: 'varchar', length: 51, nullable: true, default: null })
    form_type: string;
    @Column({ type: 'varchar', length: 51, nullable: true, default: null })
    form_selection: string;
    @Column({ type: 'text', nullable: true, default: null })
    s_department: string;
    @Column({ type: 'text', nullable: true, default: null })
    s_location: string;
    @Column({ type: 'varchar', length: 51, nullable: true, default: null })
    s_employee: string;
    @Column({ type: 'text', nullable: true, default: null })
    file_name: string;
    @Column({ type: 'varchar', length: 51, nullable: true, default: '0' })
    total_download: string;
    @Column({ type: 'datetime', nullable: true, default: null })
    request_date: Date;
    @Column({ type: 'varchar', length: 501, nullable: true, default: null })
    email: string;
    @Column({ type: 'int', nullable: true, default: null })
    status: number;
    @Column({ type: 'int', nullable: true, default: 2 })
    which_system: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated_date: Date;
}
