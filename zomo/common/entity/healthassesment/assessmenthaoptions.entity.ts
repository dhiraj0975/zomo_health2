import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
import { Enum } from '../../enum';
@Entity({ name: tableConstant.HEALTH_ASSESSMENT.TBL_HA_OPTIONS })
export class AssessmentHaOptionsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: false })
    question_id: number;
    @Column('varchar',{ length: 255, nullable: false })
    option_title: string;
    @Column('float', { nullable: false })
    algo_value: number;
    @Column('integer', { default: 0 })
    parent_id: number;
    @Column('integer', { nullable: false })
    main_option_id: number;
    @Column('integer', { nullable: false })
    order: number;
    @Column('integer', { nullable: true })
    type: number;
    @Column('integer', { nullable: false })
    risk_rating: number;
    @Column({type: 'enum', enum: Enum, default: Enum.One, nullable: true })
    status: Enum;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', onUpdate: 'CURRENT_TIMESTAMP', nullable: true, default: null })
    updated: Date;
}
