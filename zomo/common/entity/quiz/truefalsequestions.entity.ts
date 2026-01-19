import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
import { Enum } from '../../enum/enum';
;
@Entity(tableConstant.QUIZ.TBL_QZ_TF_QUESTIONS)
export class QuizTrueFalseQuestionsEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: true, default: null })
    question_id:  number;
    @Column({ type: 'int', nullable: true, default: null })
    quest_answer:  number;
    @Column({type: 'enum', enum: Enum, default: Enum.One, nullable: true })
    status: Enum;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
