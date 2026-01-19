import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';
import { tableConstant } from '../../constant';
;
;
const argon2 = require('argon2');
@Entity(tableConstant.COMPANIES.TBL_COMPANY_META)
export class CompanyMetaEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column()
    org_id: number;
    @Column({ type: 'text', nullable: true })
    custom_text: string;
    @Column({ type: 'text', nullable: true })
    website: string;
    @Column({ type: 'text', nullable: true })
    information: string;
    @Column({ type: 'text', nullable: true })
    agreement_text: string;
    @Column({ type: 'text', nullable: true })
    due_date_text: string;
    @Column({ type: 'text', nullable: true })
    a_popup_title: string;
    @Column({ type: 'text', nullable: true })
    a_popup_text: string;
    @Column({ type: 'text', nullable: true })
    sso_dtext: string;
    @Column({ type: 'text', nullable: true })
    sso_dlink: string;
    @Column({ type: 'text', nullable: true })
    enable_widget: string;
    @Column({ type: 'text', nullable: true })
    user_popup_title: string;
    @Column('integer')
    a_popup_status: number;
    @Column('integer')
    a_popup_default_status: number;
    @Column({ default: 0 })
    a_popup_require: number;
    @Column('integer')
    a_popup_logo_status: number;
    @Column({ type: 'text', nullable: true })
    plan_label: string;
    @Column({ type: 'text', nullable: true })
    zip_report_password: string;
    @Column({ type: 'text', nullable: true })
    title: string;
    @Column({ type: 'text', nullable: true })
    setting_dic: string;
    @Column({ type: 'text', nullable: true })
    newsletterthemecolors: string;
    @Column({ type: 'text', nullable: true })
    selectedweeks: string;
    @Column({ type: 'text', nullable: true })
    selectedmonths: string;
    @Column({ type: 'text', nullable: true })
    emailattachment: string;
    @Column({ default: 0 })
    created_by: number;
    @Column({ default: 0 })
    updated_by: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
    // @BeforeInsert()
    // @BeforeUpdate()
    // async hashPassword() {
    //     if (this.zip_report_password && this.zip_report_password !== '') {
    //         this.zip_report_password = Buffer.from(await argon2.hash(this.zip_report_password)).toString('base64');
    //     } else {
    //         delete this.zip_report_password;
    //     }
    // }
}
