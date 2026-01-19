import {
    BaseEntity,
    Column,
    Entity,
    PrimaryGeneratedColumn
} from 'typeorm';
import { tableConstant } from '../../constant';
;
;
@Entity({ name: tableConstant.CAMPAIGN.TBL_IN_CUSTOM_POINT_REQUEST })
export class CustomPointRequestEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: true })
    org_id: number;
    @Column('integer', { nullable: true })
    campaign_id: number;
    @Column('varchar', { length: 501, nullable: true })
    original_file: string;
    @Column('varchar', { length: 501, nullable: true })
    rejected_file: string;
    @Column('varchar', { length: 501, nullable: true })
    success_file: string;
    @Column('integer', { nullable: true })
    status: number;
    @Column('varchar', { nullable: true })
    total_download: string;
    @Column('text', { nullable: true })
    org_sheet_header: string;
    @Column('text', { nullable: true })
    mapped_header: string;
    @Column('varchar', { length: 255 })
    hash: string;
    @Column('varchar', { length: 501, nullable: true })
    created_by: string;
    @Column('varchar', { length: 501, nullable: true })
    updated_by: string;
    @Column('varchar', { nullable: true })
    request_date: string;
    @Column('varchar',{ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: string;
    @Column('varchar',{ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: string;
}
