import {
    BaseEntity,
    Column,
    Entity,
    PrimaryGeneratedColumn
} from 'typeorm';
import { tableConstant } from '../../constant';
;
;
@Entity({ name: tableConstant.CAMPAIGN.TBL_IN_CUSTOM_POINT })
export class CustomPointEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('varchar', { length: 501, nullable: true })
    user_name: string;
    @Column('integer', { nullable: true })
    user_id: number;
    @Column('integer', { nullable: true })
    org_id: number;
    @Column('integer', { nullable: true })
    activity_id: number;
    @Column('integer', { nullable: true })
    request_id: number;
    @Column('varchar', { length: 501, nullable: true })
    activity_name: string;
    @Column('varchar', { length: 501, nullable: true })
    point: string;
    @Column('varchar', { nullable: true })
    date: string;
    @Column('integer', { nullable: true })
    added_by: number;
    @Column('varchar',{ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created_date: string;
    @Column('varchar',{ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_date: string;
    @Column('integer', { nullable: true })
    status: number;
}
