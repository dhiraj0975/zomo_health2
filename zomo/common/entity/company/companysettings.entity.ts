import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
;
;
@Entity(tableConstant.COMPANIES.TBL_COMPANY_SETTINGS)
export class CompanySettingsEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer',{ nullable: false})
    org_id: number;
    @Column('varchar',{ length: 21, nullable: true })
    broker_code: string;
    @Column('integer',{ nullable: false, default: 0 })
    eligibility: number;
    @Column('integer',{ nullable: false, default: 0 })
    img_option: number;
    @Column('integer',{ nullable: true, default: 1 })
    img_area: number;
    @Column('integer',{ nullable: true, default: 30 })
    slider_limit: number;
    @Column('integer',{ nullable: false, default: 0 })
    ssn: number;
    @Column('integer',{ nullable: false, default: 0 })
    is_reqd_ssn: number;
    @Column('integer',{ nullable: true, default: 1 })
    employee_id: number;
    @Column('integer',{ nullable: false, default: 0 })
    is_reqd_empid: number;
    @Column('integer',{ nullable: false, default: 0 })
    allow_username: number;
    @Column('integer',{ nullable: false, default: 1 })
    allow_password: number;
    @Column('integer',{ nullable: false, default: 0 })
    first_login_by: number;
    @Column('varchar',{ length: 255, nullable: false, default: '' })
    pre_first_login_by: string;
    @Column('integer',{ nullable: false, default: 1 })
    block_registration: number;
    @Column('integer',{ nullable: false, default: 1 })
    lock_username: number;
    @Column('integer',{ nullable: false, default: 0 })
    spouse_widget: number;
    @Column('integer',{ nullable: false, default: 0 })
    spouse_option: number;
    @Column('varchar',{ length: 255, nullable: true, default: '' })
    wellnessprog_name: string;
    @Column('integer',{ nullable: false, default: 0 })
    editable_pdf: number;
    @Column('integer',{ nullable: false, default: 1 })
    e_timezone_setting: number;
    @Column('integer',{ nullable: false, default: 0 })
    user_form_setting: number;
    @Column('integer',{ nullable: false, default: 0 })
    chat_setting: number;
    @Column('integer',{ nullable: false, default: 0 })
    video_setting: number;
    @Column('integer',{ nullable: false, default: 0 })
    video_action: number;
    @Column('integer',{ nullable: false, default: 0 })
    agreement_status: number;
    @Column('integer',{ nullable: false, default: 0 })
    passport_menu: number;
    @Column('integer',{ nullable: false, default: 0 })
    covid_menu: number;
    @Column('integer',{ nullable: false, default: 1 })
    allow_du_login: number;
    @Column('integer',{ nullable: false, default: 1 })
    allow_ds_login: number;
    @Column('integer',{ nullable: false, default: 0 })
    chat_with_coach: number;
    @Column('integer',{ nullable: false, default: 0 })
    chat_type: number;
    @Column('integer',{ nullable: false, default: 0 })
    form_limit: number;
    @Column('integer',{ nullable: false, default: 0 })
    show_quicklink_in_sidebar: number;
    @Column('integer',{ nullable: false, default: 0 })
    is_emo_health_asssessments: number;
    @Column('integer',{ nullable: false, default: 0 })
    pointsleaderboard: number;
    @Column('integer',{ nullable: false, default: 0 })
    pointsleaderboardmin: number;
    @Column('integer',{ nullable: false, default: 0 })
    user_popup_status: number;
    @Column('integer',{ nullable: false, default: 0 })
    dashboard_point_leaboard: number;
    @Column('integer',{ nullable: false, default: 0 })
    campaign_id: number;
    @Column('integer',{ nullable: false, default: 0 })
    health_a_based_on: number;
    @Column('integer',{ nullable: false, default: 1 })
    ha_biomatricstep_hs: number;
    @Column('integer',{ nullable: false, default: 0 })
    spouse_email_collection_on_off: number;
    @Column('integer',{ nullable: false, default: 0 })
    spouse_email_collection_required: number;
    @Column('integer',{ nullable: false, default: 0 })
    census_status: number;
    @Column('integer',{ nullable: false, default: 0 })
    plan_order: number;
    @Column('integer',{ nullable: false, default: 0 })
    health_form_popup: number;
    @Column('integer',{ nullable: false, default: 0 })
    health_form_mail: number;
    @Column('integer',{ nullable: false, default: 0 })
    hide_assessment: number;
    @Column('integer',{ nullable: false, default: 0 })
    is_internationalization: number;
    @Column('integer',{ nullable: false, default: 0 })
    pointsleaderboardpopup: number;
    @Column('integer',{ nullable: false, default: 0 })
    enable_popup: number;
    @Column('integer',{ nullable: false, default: 0 })
    enable_logo: number;
    @Column('integer', { nullable: true, default: 1000 })
    data_limit: number;
    @Column('varchar',{ length: 500, nullable: true })
    logo_image: string;
    @Column({ nullable: true })
    start_date: Date;
    @Column('integer',{ nullable: false, default: 0 })
    frequency_type: number;
    @Column({ nullable: true })
    end_date: Date;
    @Column('integer',{ nullable: false, default: 0 })
    popup_based_on: number;
    @Column('integer',{ nullable: false, default: 0 })
    reset_password_mandatory: number;
    @Column('integer',{ default: 0 })
    is_zomo_on: number;
    @Column('integer',{ default: 0 })
    created_by: number;
    @Column('integer',{ default: 0 })
    updated_by: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
