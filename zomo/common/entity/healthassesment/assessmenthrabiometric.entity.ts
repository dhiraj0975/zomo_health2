import {
    BaseEntity,
    Column,
    Entity,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
;
;
@Entity({ name: tableConstant.HEALTH_ASSESSMENT.TBL_HA_HRABIOMETRICS })
export class AssessmentHraBiometricEntity extends BaseEntity {     
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: false })
    user_id: number;
    @Column('text', { nullable: false })
    activity_id: string;
    @Column('integer', { nullable: true })
    weight: number;
    @Column('integer', { nullable: true })
    height_ft: number;
    @Column('integer', { nullable: true })
    height_in: number;
    @Column('integer', { nullable: false })
    weight_source: number;
    @Column('integer', { nullable: true })
    bp_systolic: number;
    @Column('integer', { nullable: true })
    bp_diastolic: number;
    @Column('integer', { nullable: false })
    bp_source: number;
    @Column('integer', { nullable: true })
    blood_glucose: number;
    @Column('integer', { nullable: false })
    test_type: number;
    @Column('integer', { nullable: false })
    blood_glucose_source: number;
    @Column('varchar', { length: 4, nullable: false })
    alc: string;
    @Column('integer', { nullable: true })
    total_cholesterol: number;
    @Column('integer', { nullable: true })
    hdl: number;
    @Column('integer', { nullable: true })
    ldl: number;
    @Column('integer', { nullable: false })
    atriskldl: number;
    @Column('integer', { nullable: true })
    triglycerides: number;
    @Column('integer', { nullable: false })
    cholestrol_source: number;
    @Column('integer', { nullable: true })
    body_fat: number;
    @Column('integer', { nullable: true })
    body_fat_source: number;
    @Column('integer', { nullable: true })
    hip: number;
    @Column('integer', { nullable: true })
    waist: number;
    @Column('integer', { nullable: true })
    arm: number;
    @Column('integer', { nullable: true })
    leg: number;
    @Column('integer', { nullable: true })
    calve: number;
    @Column('integer', { nullable: true })
    measurement_source: number;
    @Column('integer', { nullable: false })
    source: number;
    @Column('timestamp',{ nullable: false })
    date: Date;
    @Column({ type: 'int', default: 1 })
    status: number;
}
