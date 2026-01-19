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
@Entity({ name: tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS })
export class AssessmentQuestionsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: false })
    tab_id: number;
    @Column('integer', { nullable: false, default: 1 })
    type: number;
    @Column('integer', { nullable: false })
    question_type: number;
    @Column('integer', { nullable: false })
    show_gender: number;
    @Column('integer', { nullable: false, default: 0 })
    parent_id: number;
    @Column('integer', { nullable: false, default: 0 })
    parent_option_id: number;
    @Column('integer', { nullable: false })
    sort_order: number;
    @Column('integer', { nullable: false })
    required: number;
    @Column('integer', { nullable: false })
    general_info: number;
    @Column('integer', { nullable: false, default: 0 })
    not_applicable: number;
    @Column('integer', { nullable: false, default: 0 })
    m_section_weight: number;
    @Column('integer', { nullable: false, default: 0 })
    f_section_weight: number;
    @Column('integer', { nullable: false })
    age_considered: number;
    @Column('integer', { nullable: true })
    age_limit: number;
    @Column('integer', { nullable: false })
    age_condition: number;
    @Column('integer', { nullable: false, default: 0 })
    result_type: number;
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
