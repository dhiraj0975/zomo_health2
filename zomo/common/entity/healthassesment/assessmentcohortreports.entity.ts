import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
import {System_Type} from "../../enum";
;
;
@Entity({ name: tableConstant.HEALTH_ASSESSMENT.TBL_HA_COHORTREPORTS })
export class AssessmentCohortReportsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: true })
    org_id: number;
    @Column('integer', { nullable: true })
    user_id: number;
    @Column('varchar', { length: 255, nullable: true })
    year: string;
    @Column('text', { nullable: true })
    condition: string;
    @Column('integer', { nullable: true })
    campaign_id: number;
    @Column('text', { nullable: true })
    Campaignactivity: string;
    @Column('text', { nullable: true })
    source_ids: string;
    @Column('text', { nullable: true })
    file: string;
    @Column('timestamp',{ nullable: true })
    request_date: Date;
    /*status default zero set do not change 0 -> 1 */
    @Column('integer', { nullable: false, default: 0 })
    status: number;
    @Column('integer', { nullable: false, default: 0 })
    flage: number;
    @Column('integer', { nullable: false, default: 0 })
    reject: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_date: Date;
    @Column({
        type: 'enum',
        enum: System_Type,
        default: System_Type.NEW,
    })
    system_type: System_Type;
}
