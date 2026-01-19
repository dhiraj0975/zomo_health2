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
@Entity(tableConstant.QUIZ.TBL_QZ_FILLUP_QUESTIONS)
export class QuizFillUpQuestionEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int' })
    question_id: number;
    @Column({ type: 'varchar', length: 250, nullable: true, default: null })
    blank_options:  string;
    @Column({ type: 'varchar', length: 250, nullable: true, default: null })
    correct_blank:  string;
    @Column({type: 'enum', enum: Enum, default: Enum.One, nullable: true })
    status: Enum;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
