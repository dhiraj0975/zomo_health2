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
@Entity({ name: tableConstant.CHALLENGE.TBL_CH_HEALTH_REQUEST })
export class HealthRequestEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: true, default: null})
    org_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    user_id: number;
    @Column({ type: 'text', nullable: true, default: null })
    origional_file: string;
    @Column({ type: 'text', nullable: true, default: null })
    created_file: string;
    @Column('text', { nullable: true })
    org_sheet_header: string;
    @Column('text', { nullable: true })
    mapped_header: string;
    @Column('varchar', { length: 255 })
    hash: string;
    @Column({ type: 'int', nullable: false })
    schedule_id: number;
    @Column({ type: 'text', nullable: true, default: null })
    rejected_file: string;
    @Column({ type: 'datetime', nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    request_date: Date;
    @Column({ type: 'varchar', length: 501, nullable: true, default: null })
    email: string;
    @Column({ type: 'int', nullable: true, default: 0 })
    status: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    flage: number;
    @Column({ type: 'varchar', length: 256, nullable: true, default: null })
    file_error: string;
    @Column({ type: 'int', nullable: true, default: null })
    created_by: number;
    @Column({ type: 'int', nullable: true, default: null })
    updated_by: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: null, onUpdate: 'CURRENT_TIMESTAMP' })
    updated_date: Date;
}
