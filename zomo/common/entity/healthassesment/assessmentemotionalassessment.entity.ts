import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
;
;
@Entity({ name: tableConstant.HEALTH_ASSESSMENT.TBL_HA_EMOTIONAL_ASSESSMENTS })
export class AssessmentEmotionalAssessmentEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: false })
    user_id: number;
    @Column('float', { nullable: false, default: 0 })
    hra_status: number;
    @Column('integer', { nullable: false, default: 1 })
    status: number;
    @Column('integer', { nullable: false, default: 0 })
    eha_reset: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
