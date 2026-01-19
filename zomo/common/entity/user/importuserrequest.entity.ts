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
@Entity({ name: tableConstant.TBL_IMPORT_USER_REQUEST })
export class ImportUserRequestEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { default: 0 })
    parent_id: number;
    @Column('text', { nullable: true })
    hash: string;
    @Column('integer', { nullable: true })
    org_id: number;
    @Column('integer', { nullable: true })
    user_id: number;
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
    @Column('text', { nullable: true })
    terminated_file: string;
    @Column('integer', { default: 0 })
    terminated_count: number;
    @Column({ type:'timestamp', nullable: true })
    request_date: Date;
    @Column('integer', { nullable: false, default: 0 })
    user_notify: number;
    @Column('integer', { default: 0 })
    reset_password: number;
    @Column('varchar', { length: 501, nullable: true })
    email: string;
    @Column('integer', { nullable: false, default: 0 })
    census_upload_type: number;
    @Column('integer', { nullable: false, default: 0 })
    census_upload_type_on: number;
    @Column('integer', { default: 1 })
    status: number;
    @Column('integer', { nullable: false })
    flage: number;
    @Column('integer', { nullable: false, default: 0 })
    sysissue: number;
    @Column('integer', { nullable: false, default: 0 })
    lastdata: number;
    @Column('integer', { default: 0 })
    terminate_step: number;
    @Column('integer', { nullable: false, default: 0 })
    requeststep: number;
    @Column('varchar', { length: 256, nullable: true })
    file_error: string;
    @Column('text', { nullable: true })
    org_sheet_header: string;
    @Column('text', { nullable: true })
    mapped_header: string;
    @Column('integer', { nullable: false, default: 0 })
    spouserequired: number;
    @Column('integer', { nullable: false, default: 0 })
    source_type: number;
    @Column('integer', { nullable: false, default: 0 })
    cuser_notify: number;
    @Column('integer', { nullable: false, default: 0 })
    partial_count: number;
    @Column('text', { nullable: true })
    partial_file: string;
    @Column('text', { nullable: true })
    skip_file: string;
    @Column('integer', { default: 0 })
    skip_count: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_date: Date;
    @Column('integer', { default: 1 })
    source: number;
}
