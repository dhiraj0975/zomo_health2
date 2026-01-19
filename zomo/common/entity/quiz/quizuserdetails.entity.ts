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
@Entity(tableConstant.QUIZ.TBL_QZ_QUIZ_USER_DETAILS)
export class QuizUserDetailsEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: true, default: null })
    quiz_id:  number;
    @Column({ type: 'int', nullable: true, default: null })
    question_id:  number;
    @Column({ type: 'int', nullable: true, default: null })
    user_id:  number;
    @Column({ type: 'int', nullable: true, default: null })
    skip:  number;
    @Column({ type: 'text', nullable: true, default: null })
    answer:  string;
    @Column({ type: 'text', nullable: true, default: null })
    correct_answer:  string;
    @Column({ type: 'timestamp', nullable: true, default: null })
    date:  number;
    @Column({ type: 'varchar', length: 250, nullable: true, default: null })
    qtype:  string;
    @Column({ type: 'int', nullable: false, default: 0 })
    user_detail_id:  number;
    @Column({ type: 'int', default: 1 })
    status: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
