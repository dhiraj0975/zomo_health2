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
@Entity(tableConstant.QUIZ.TBL_QZ_MATCHING_DROPDOWN_QUESTIONS)
export class QuizMatchingDropDownQuestionEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int' })
    question_id	:  number;
    @Column({ type: 'varchar', length: 250, nullable: true, default: null })
    drop_options:  string;
    @Column({ type: 'varchar', length: 250, nullable: true, default: null })
    num_drop_opts:  string;
    @Column({ type: 'varchar', length: 50, nullable: true, default: null })
    right_answer:  string;
    @Column({type: 'enum', enum: Enum, default: Enum.One, nullable: true })
    status: Enum;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
