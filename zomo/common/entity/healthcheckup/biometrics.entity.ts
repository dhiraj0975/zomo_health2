import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
;
@Entity({ name: tableConstant.HEALTH_CHECKUP.TBL_HC_BIOMETRICS })
export class BiometricsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Index()
    @Column({ type: 'int' })
    user_id: number;
    @Column({ type: 'text' })
    activity_id: string;
    @Column({ type: 'int' })
    physician_id: number;
    @Column({ type: 'varchar', length: 10 })
    gender: string;
    @Column({ type: 'varchar', length: 10 })
    height: string;
    @Column({ type: 'varchar', length: 10 })
    weight: string;
    @Column({ type: 'varchar', length: 10 })
    bmi: string;
    @Column({ type: 'varchar', length: 10 })
    systolic: string;
    @Column({ type: 'varchar', length: 10 })
    diastolic: string;
    @Column({ type: 'varchar', length: 10 })
    blood_glucose: string;
    @Column({ type: 'tinyint' })
    test_type: number;
    @Column({ type: 'varchar', length: 10 })
    alc: string;
    @Column({ type: 'varchar', length: 10 })
    hdl: string;
    @Column({ type: 'varchar', length: 10 })
    ldl: string;
    @Column({ type: 'varchar', length: 10 })
    total_cholesterol: string;
    @Column({ type: 'varchar', length: 10 })
    triglycerides: string;
    @Column({ type: 'varchar', length: 10, nullable: true, default: null })
    waist: string;
    @Column({ type: 'text', nullable: true, default: null })
    disease_id: string;
    @Column({ type: 'date' })
    heightdate: Date;
    @Column({ type: 'date' })
    weightdate: Date;
    @Column({ type: 'date' })
    diastolicdate: Date;
    @Column({ type: 'date' })
    bloodglucosedate: Date;
    @Column({ type: 'date' })
    a1cdate: Date;
    @Column({ type: 'date' })
    hdldate: Date;
    @Column({ type: 'date' })
    ldldate: Date;
    @Column({ type: 'date' })
    total_cholesteroldate: Date;
    @Column({ type: 'date' })
    triglyceridedate: Date;
    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    waistdate: Date;
    @Column({ type: 'int' })
    co_testing_method: number;
    @Column({ type: 'int' })
    co_qualitative_results_check_one: number;
    @Column({ type: 'varchar', length: 256 })
    co_qualitative_results: string;
    @Column({ type: 'date' })
    date_obtain: Date;
    @Column({ type: 'varchar', length: 255 })
    aas_form_prog: string;
    @Column({ type: 'int' })
    is_tobacco_user: number;
    @Column({ type: 'int' })
    preventative_visit: number;
    @Column({ type: 'varchar', length: 255, nullable: true, default: null })
    signature: string;
    @Column({ type: 'int', nullable: true, default: null })
    is_signed: number;
    @Column( { type: 'int' })
    source: number;
    @Column( { type: 'int' })
    enter_by: number;
    @Column({ type: 'int', default: 1 })
    status: number;
    @Index()
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    inserted: Date;
}
