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
@Entity({ name: tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_TABS })
export class AssessmentTabsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: false })
    organization_id: number;
    @Column('varchar', { length: 512, nullable: false })
    title: string;
    @Column('integer', { nullable: false, default: 0 })
    sort_order: number;
    @Column('text', { nullable: false })
    'marker-low': string;
    @Column('text', { nullable: false })
    'marker-mod': string;
    @Column('text', { nullable: false })
    'marker-high': string;
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
