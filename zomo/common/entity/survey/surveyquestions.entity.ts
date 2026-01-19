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
@Entity({ name: tableConstant.SURVEY.TBL_C_SURVEY_QUESTIONS })
export class SurveyQuestionsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: false })
    org_id: number;
    @Column('integer', { nullable: false })
    popup_id: number;
    @Column('varchar', { nullable: false, length: 512 })
    title: string;
    @Column('integer', { nullable: false, default: 0 })
    ans_option_type: number;
    @Column('integer', { nullable: false, default: 0 })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
    @Column('integer', { nullable: true})
    created_by: number;
    @Column('integer', { default: 0})
    updated_by: number;
}
