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
@Entity(tableConstant.QUIZ.TBL_QZ_QUIZ_CLICKS)
export class QuizClicksEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: true, default: null })
    qz_assign_id:  number;
    @Column({ type: 'int', nullable: true, default: null })
    user_id	:  number;
    @Column({ type: 'int', nullable: true, default: null })
    activity_id:  number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated_date: Date;
    @Column('integer', { nullable: true, default: 1 })
    status:  number;
}
