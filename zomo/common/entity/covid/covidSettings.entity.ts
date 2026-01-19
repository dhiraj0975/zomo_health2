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
@Entity({ name: tableConstant.COVID.COVID_SETTINGS })
export class CovidSettingsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int' })
    org_id: number;
    @Column({ type: 'varchar', length: 512 })
    title: string;
    @Column({ type: 'text' })
    logo: string;
    @Column({ type: 'text' })
    description: string;
    @Column({ type: 'text', nullable: true })
    department_string: string;
    @Column({ type: 'text', nullable: true })
    location_string: string;
    @Column({ type: 'text' })
    need_checkup_text: string;
    @Column({ type: 'text', nullable: true })
    need_checkup_desc: string;
    @Column({ type: 'text' })
    no_need_checkup_text: string;
    @Column({ type: 'text', nullable: true })
    no_need_checkup_desc: string;
    @Column({ type: 'int', default: 0 })
    status: number;
    @Column({ type: 'varchar', length: 512, nullable: true })
    email_added: string;
    @Column({ type: 'int', default: 0 })
    email_setting: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
    @Column({ type: 'text', nullable: true }) 
    additional_note: string;
    @Column({ type: 'int', default: 0 })
    symptom_traker_setting: number;
    @Column({ type: 'int', default: 0 }) 
    selected_frequency: number;
    @Column({ type: 'text', nullable: true })
    popup_header_image: string;
    @Column({ type: 'text', default: '01:00:00' }) 
    selected_frequency_time: string;
    @Column({ type: 'text', nullable: true })
    selectedweekday: string;
    @Column({ type: 'int', default: 0 })
    show_login_time: number;
    @Column({ type: 'int', default: 0 }) 
    is_eligibility: number;
}
