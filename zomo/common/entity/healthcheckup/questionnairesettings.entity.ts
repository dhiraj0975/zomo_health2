import {
    BaseEntity,
    Column,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';
import { tableConstant } from '../../constant';
@Entity({ name: tableConstant.HEALTH_CHECKUP.TBL_HC_QUESTIONNAIRE_SETTINGS })
export class QuestionnaireSettingsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'integer' })
    org_id: number;
    @Column({ type: 'varchar',length: 512 })
    title: string;
    @Column({ type: 'text' })
    header_text: string;
    @Column({ type: 'integer', default: 0 })
    eligibility: number;
    @Column({ type: 'integer', default: 0 })
    display: number;
    @Column({ type: 'integer', default: 0 })
    is_logo: number;
    @Column({ type: 'integer', default: 0 })
    status: number;
    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
