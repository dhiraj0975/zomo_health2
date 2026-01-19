import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
;
;
@Entity(tableConstant.QUIZ.TBL_QZ_QUIZ_DETAILS)
export class QuizDetailsEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: true })
    quiz_id:  number;
    @Column('varchar', { nullable: true })
    quiz_type:  string;
    @Column('varchar', { nullable: true })
    ques_cat:  string; /* ques -> quiz*/
    @Column('varchar', { nullable: true })
    ques_section:  string; /* ques -> quiz*/
    @Column('text', { nullable: true })
    quiz_question:  string;
    @Column('text', { nullable: true })
    answer_desc:  string;
    @Column('varchar', { nullable: true })
    quest_time:  string;
    @Column('text', { nullable: true })
    question_type:  string;
    @Column('text', { nullable: true })
    question_info:  string;
    @Column('integer', { nullable: true })
    quest_order:  number;
    @Column('time', { nullable: true})
    quest_set_time:  number;
    @Column('varchar', { nullable: true, default: 1 })
    status:  number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
