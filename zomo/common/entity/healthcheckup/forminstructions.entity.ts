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
@Entity({ name: tableConstant.HEALTH_CHECKUP.TBL_HC_FORM_INSTRUCTIONS })
export class FormInstructionsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int' })
    company_id: number;
    @Column({ type: 'varchar', nullable: true, default: null })
    pf_start_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    pf_end_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    pf_fax_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    dvf_start_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    dvf_end_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    dvf_fax_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    ovf_start_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    ovf_end_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    ovf_fax_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    ta_start_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    ta_end_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    ta_fax_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    start_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    end_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    fax_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    feature_hra_date: string;
    @Column({ type: 'int', nullable: true, default: null })
    reset_date_range: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    current_tab: number;
    @Column({ type: 'varchar', nullable: true, default: null })
    reset_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    feature_fax_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    feature_end_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    feature_start_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    ta_reset_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    feture_ta_fax_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    feture_ta_end_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    feture_ta_start_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    ovf_reset_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    feture_ovf_fax_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    feture_ovf_end_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    feture_ovf_start_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    dvf_reset_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    feture_dvf_faxt_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    feture_dvf_end_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    feture_dvf_start_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    pf_reset_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    feture_pf_fax_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    feture_pf_end_date: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    feture_pf_start_date: string;
    @Column({ type: 'varchar', length: 50 })
    fax_number: string;
    @Column({ type: 'text', nullable: true, default: null })
    program_custom_name: string;
    @Column({ type: 'varchar', length: 50 })
    program_selection: string;
    @Column({ type: 'int'})
    date_range: number;
    @Column({ type: 'int', default: 1 })
    forms_year: number;
    @Column({ type: 'int', default: 2 })
    yearly_opts: number;
    @Column({ type: 'int'})
    dentures: number;
    @Column({ type: 'varchar' })
    cover_page: string;
    @Column({ type: 'text' })
    physician_text: string;
    @Column({ type: 'varchar', length: 255, nullable: true, default: null })
    before_title: string;
    @Column({ type: 'varchar', length: 255, nullable: true, default: null })
    before_age_title: string;
    @Column({ type: 'text' })
    dentists_text: string;
    @Column({ type: 'text' })
    optometrists_text: string;
    @Column({ type: 'text' })
    tobacco_text: string;
    @Column({ type: 'text' })
    tobacco_cessation_text: string;
    @Column({ type: 'text' })
    tobacco_para1: string;
    @Column({ type: 'int'})
    tobacco_form_option: number;
    @Column({ type: 'varchar', length: 255 })
    optionalpage: string;
    @Column({ type: 'varchar', length: 250, nullable: true, default: null })
    disease_ids: string;
    @Column({ type: 'varchar', length: 255, nullable: true, default: null })
    assign_disease_ids: string;
    @Column({ type: 'text', nullable: true, default: null })
    disease_text: string;
    @Column({ type: 'text', nullable: true, default: null })
    disease_instruction_text: string;
    @Column({ type: 'int', nullable: true, default: null })
    disease_coverpage_options: number;
    @Column({ type: 'int'})
    bio_option: number;
    @Column({ type: 'int', default: 0 })
    prevent_option: number;
    @Column({ type: 'varchar', length: 255, nullable: true, default: null })
    age_gender_title: string;
    @Column({ type: 'text', nullable: true, default: null })
    age_gender_text: string;
    @Column({ type: 'varchar', length: 255 })
    bio_data_field: string;
    @Column({ type: 'varchar', length: 255 })
    aas_form_prog: string;
    @Column({ type: 'int' })
    is_logo: number;
    @Column('varchar', { default: '0,1,2' })
    submition_option: string;
    @Column({ type: 'int', default: 1 })
    status: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
