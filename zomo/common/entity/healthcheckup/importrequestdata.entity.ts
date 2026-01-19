import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';
import { tableConstant } from '../../constant';
;
;
@Entity({ name: tableConstant.HEALTH_CHECKUP.TBL_HC_IMPORT_USER_REQUEST })
export class ImportRequestDataEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: true })
    org_id: number;
    @Column('text', { nullable: true })
    origional_file: string;
    @Column('text', { nullable: true })
    created_file: string;
    @Column('integer', { default: 0 })
    created_count: number;
    @Column('text', { nullable: true })
    updated_file: string;
    @Column('integer', { default: 0 })
    updated_count: number;
    @Column('text', { nullable: true })
    rejected_file: string;
    @Column('integer', { default: 0 })
    rejected_count: number;
    @Column('integer', { nullable: false, default: 0 })
    user_notify: number;
    @Column('integer', { nullable: false, default: 0 })
    upload_type: number;
    @Column('integer', { default: 1 })
    status: number;
    @Column('varchar', { length: 256, nullable: true })
    file_error: string;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_date: Date;
}
