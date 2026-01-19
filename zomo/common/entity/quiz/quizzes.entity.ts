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
@Entity(tableConstant.QUIZ.TBL_QZ_QUIZZES)
export class QuizQuizzesEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: true, default: null })
    cat_id:  number;
    @Column({ type: 'varchar', length: 250, nullable: true, default: null })
    image:  string;
    @Column({ type: 'varchar', length: 250, nullable: true, default: null })
    quiz_name:  string;
    @Column({ type: 'text', nullable: true, default: null })
    quiz_description:  string;
    @Column({ type: 'int', nullable: true, default: null })
    question_per_page:  number;
    @Column({ type: 'int', nullable: true, default: 1 })
    num_of_questions:  number;
    @Column({ type: 'int', nullable: true, default: 0 })
    quiz_order:  number;
    @Column({ type: 'int', nullable: true, default: 1 })
    status:  number;
    @Column({ type: 'varchar', length: 250 })
    quiz_type:  string;
    @Column({ type: 'varchar', length: 250 })
    question_type:  string;
    @Column({ type: 'varchar', length: 250 })
    question_info:  string;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
    @Column({ type: 'int', nullable: false, default: 0 })
    webinar_id:  number;
    @Column({ type: 'tinyint', nullable: false, default: 0 })
    is_default:  number;
    @Column({ type: 'tinyint', nullable: false, default: 0 })
    is_webinar:  number;
}
