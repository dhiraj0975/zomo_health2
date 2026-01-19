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
@Entity({ name: tableConstant.SURVEY.TBL_C_SURVEY_POPUP })
export class SurveyPopupEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: false })
    org_id: number;
    @Column('varchar', { nullable: false, length: 512 })
    title: string;
    @Column('text', { nullable: true })
    description: string;
    @Column('text', { nullable: true })
    department_string: string;
    @Column('text', { nullable: true })
    location_string: string;
    @Column('text', { nullable: true })
    pass_need_text: string;
    @Column('text', { nullable: true })
    pass_need_desc: string;
    @Column('integer', { nullable: false, default: 0 })
    pass_need_check: number;
    @Column('text', { nullable: true })
    fail_need_text: string;
    @Column('text', { nullable: true })
    fail_need_desc: string;
    @Column('integer', { nullable: false, default: 0 })
    fail_need_check: number;
    @Column('integer', { nullable: false, default: 1 })
    status: number;
    @Column('text', { nullable: true })
    email_added: string;
    @Column('integer', { default: 0 })
    email_setting: number;
    @Column('text', { nullable: true })
    additional_note: string;
    @Column('integer', { default: 0 })
    selected_frequency: number;
    @Column('varchar', { default: '01:00:00' })
    selected_frequency_time: string;
    @Column('varchar', { nullable: false, length: 255 })
    selectedweekday: string;
    @Column('integer', { default: 0 })
    show_login_time: number;
    @Column('integer', { default: 0 })
    is_eligibility: number;
    @Column('text', { nullable: true })
    popup_header_image: string;
    @Column('integer', { nullable: false, default: 0})
    show_required: number;
    @Column('integer', { nullable: true})
    created_by: number;
    @Column('integer', { default: 0})
    updated_by: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
