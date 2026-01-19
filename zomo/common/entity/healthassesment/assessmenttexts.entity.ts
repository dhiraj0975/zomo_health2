import {
    BaseEntity,
    Column,
    Entity,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
;
;
@Entity({ name: tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_TEXTS })
export class AssessmentTextsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: false })
    ass_sec_id: number;
    @Column('integer', { nullable: false })
    language_id: number;
    @Column('text', { nullable: false })
    low_risk: string;
    @Column('text', { nullable: false })
    mod_risk: string;
    @Column('text', { nullable: false })
    high_risk: string;
    @Column('text', { nullable: false })
    very_high_risk: string;
    @Column('text', { nullable: false })
    learn_more: string;
    @Column({ type: 'int', default: 1 })
    status: number;
}
