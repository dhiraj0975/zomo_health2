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
@Entity(tableConstant.QUIZ.TBL_QZ_ASSIGN_QUIZ_ORG)
export class QuizAssignQuizOrgEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int' })
    quiz_id: number;
    @Column({ type: 'varchar', length: 255 })
    organization_id: string;
    @Column({ type: 'varchar', length: 250 })
    start_date: string;
    @Column({ type: 'varchar', length: 250 })
    end_date: string;
    @Column({ type: 'time', default: '00:00:00' })
    start_time: string;
    @Column({ type: 'time', default: '23:59:00' })
    end_time: string;
    @Column({ type: 'int', default: 1 })
    timezone: number;
    @Column({ type: 'int' })
    allow_retakes:  number;
    @Column({ type: 'int' })
    retakes:  number;
    @Column({ type: 'int', default: 1 })
    status: number;
    @Column({ type: 'int' })
    time_dependent:  number;
    @Column({type: 'enum', enum: Enum, default: Enum.Zero,})
    timer_type: Enum;
    @Column({ type: 'time', default: '00:00:00' })
    quiz_time: string;
    @Column({ type: 'int', nullable: true, default: null })
    passing_score: number;
    @Column({ type: 'int' })
    publish_result: number;
    @Column({ type: 'int', nullable: true, default: null })
    activity_id: number;
    @Column({ type: 'text' })
    vmsg:  string;
    @Column({ type: 'int', default: 0 })
    is_hire: number;
    @Column({ type: 'int', default: 0 })
    is_timezone: number;
    @Column({ type: 'int', default: 0 })
    webinar_id: number;
    @Column({ type: 'int', default: 0 })
    is_webinar: number;
    // 1=schedule quiz, 2=webinar quiz
    @Column({ type: 'int', default: 0 })
    quiz_type: number;
    @Column({ type: 'text' })
    vlink:  string;
    @Column({ type: 'int', default: 1 })
    is_popup:  number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: string;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated: string;
}
