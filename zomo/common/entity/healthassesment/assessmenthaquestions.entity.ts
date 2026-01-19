import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
import { Enum } from '../../enum';
@Entity({ name: tableConstant.HEALTH_ASSESSMENT.TBL_HA_QUESTIONS })
export class AssessmentHaQuestionsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: false })
    questioncat_id: number;
    @Column('integer', { nullable: false })
    language_id: number;
    @Column('integer', { nullable: false })
    main_question_id: number;
    @Column('varchar', { length: 255, nullable: false })
    title: string;
    @Column('varchar', { length: 255, nullable: false })
    question_title: string;
    @Column('integer', { nullable: false })
    type: number;
    @Column('integer', { nullable: false })
    show: number;
    @Column('text', { nullable: false })
    company_id: string;
    @Column('integer', { nullable: true })
    parent_id: number;
    @Column('integer', { nullable: true })
    parent_option_id: number;
    @Column('integer', { nullable: false })
    order: number;
    @Column('text', { nullable: false })
    general: string;
    @Column('integer', { nullable: false, default: 0 })
    required: number;
    @Column('integer', { nullable: false, default: 0 })
    na: number;
    @Column('varchar', { length: 100, nullable: false })
    question_code: string;
    @Column('varchar', { length: 100, nullable: false })
    chart_group: string;
    @Column('integer', { nullable: false })
    mchart_group_wt: number;
    @Column('integer', { nullable: false })
    fchart_group_wt: number;
    @Column('integer', { nullable: false })
    msection_wt: number;
    @Column('integer', { nullable: false })
    fsection_wt: number;
    @Column('integer', { nullable: false })
    age_considered: number;
    @Column('integer', { nullable: true })
    age_limit: number;
    @Column('integer', { nullable: false })
    age_condition: number;
    @Column({type: 'enum', enum: Enum, default: Enum.One, nullable: true })
    status: Enum;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: null, onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
