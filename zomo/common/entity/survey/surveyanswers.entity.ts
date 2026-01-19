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
@Entity({ name: tableConstant.SURVEY.TBL_C_SURVEY_ANSWERS })
export class SurveyAnswersEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: false })
    q_id: number;
    @Column('varchar', { nullable: false, length: 512 })
    title: string;
    @Column('integer', { nullable: false, default: 0 })
    correct_ans: number;
    @Column('integer', { nullable: false, default: 1 })
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
