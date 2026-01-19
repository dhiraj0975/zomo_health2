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
@Entity(tableConstant.QUIZ.TBL_QZ_USER_DETAILS)
export class UserDetailsEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'varchar', length: 250, nullable: true, default: null })
    user_name:  string;
    @Column({ type: 'varchar', length: 250, nullable: true, default: null })
    user_email:  string;
    @Column({ type: 'varchar', length: 255 })
    membership_code:  string;
    @Column({ type: 'int', nullable: true, default: null })
    user_id:  number;
    @Column({ type: 'int', nullable: true, default: null })
    quiz_cat:  number;
    @Column({ type: 'int', nullable: true, default: null })
    quiz_id:  number;
    @Column({ type: 'int', nullable: true, default: 0 })
    pause:  number;
    @Column({ type: 'float', nullable: true, default: null })
    score:  number;
    @Column({ type: 'varchar', length: 50, nullable: true, default: 'no' })
    completed:  string;
    @Column({ type: 'varchar', length: 50, nullable: true, default: null })
    total_questions:  string;
    @Column({ type: 'int', nullable: true, default: null })
    activity_id:  number;
    @Column({ type: 'varchar', length: 250, nullable: true, default: null })
    ptime:  string;
    @Column({ type: 'varchar', length: 256, nullable: true, default: null })
    timezone_name:  string;
    @Column({ type: 'int', default: 1 })
    status: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
