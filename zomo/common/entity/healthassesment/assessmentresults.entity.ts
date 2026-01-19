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
@Entity({ name: tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS })
export class AssessmentResultsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: false })
    organization_id: number;
    @Column('varchar', { length: 512, nullable: false })
    title: string;
    @Column('text', { nullable: false })
    'marker-low': string;
    @Column('text', { nullable: false })
    'marker-mod': string;
    @Column('text', { nullable: false })
    'marker-high': string;
    @Column('integer', { nullable: false, default: 0 })
    type: number;
    @Column('integer', { nullable: false, default: 0 })
    is_response: number;
    @Column('text', { nullable: false })
    'marker-common': string;
    @Column('text', { nullable: false })
    'marker-common_last': string;
    @Column('integer', { nullable: false, default: 0 })
    order_id: number;
    @Column('integer', { nullable: false, default: 1 })
    no_of_risk: number;
    @Column('integer', { nullable: false, default: 1 })
    status: number;
    @Column('integer', { nullable: false, default: 0 })
    created_by: number;
    @Column('integer', { nullable: false, default: 0 })
    updated_by: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
