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
@Entity({ name: tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS })
export class AssessmentOptionsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: false })
    question_id: number;
    @Column('integer', { nullable: true })
    parent_id: number;
    @Column('integer', { nullable: false })
    sort_order: number;
    @Column('integer', { nullable: true })
    range_type: number;
    @Column('integer', { nullable: true })
    start_value: number;
    @Column('integer', { nullable: true })
    end_value: number;
    @Column('integer', { nullable: false })
    risk_rating: number;
    @Column('integer', { nullable: false })
    type: number;
    @Column('integer', { nullable: false, default: 1 })
    status: number;
    @Column('integer', { nullable: false, default: 0 })
    created_by: number;
    @Column('integer', { nullable: false, default: 0 })
    updated_by: number;
    @Column('text',{ nullable: false })
    message_add: string;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
