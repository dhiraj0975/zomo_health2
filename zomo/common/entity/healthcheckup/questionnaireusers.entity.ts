import {
    BaseEntity,
    Column,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';
import { tableConstant } from '../../constant';
@Entity({ name: tableConstant.HEALTH_CHECKUP.TBL_HC_QUESTIONNAIRE_USERS })
export class QuestionnaireUsersEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int' })
    org_id: number;
    @Column({ type: 'int' })
    user_id: number;
    @Column({ type: 'text', nullable: true, default: null })
    entry_name: string;
    @Column({ type: 'text', nullable: true, default: null })
    entry_empid: string;
    @Column({ type: 'int', default: 0 })
    medical_status_one: number;
    @Column({ type: 'int', default: 0 })
    medical_status_two: number;
    @Column({ type: 'int', default: 0 })
    status: number;
    @Column({ type: 'int', default: 0 })
    participation_wp: number;
    @Column({ type: 'int', default: 0 })
    participation_wp_data: number;
    @Column({ type: 'int', default: 0 })
    wellness_score_one: number;
    @Column({ type: 'int', default: 0 })
    wellness_score_two: number;
    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
