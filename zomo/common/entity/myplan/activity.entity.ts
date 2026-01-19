import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
;
;
@Entity(tableConstant.MY_PLAN.TBL_MP_ACTIVITY)
export class MyPlanActivityEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int' })
    activity_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    organization_id: number;
    @Index()
    @Column({ type: 'int', nullable: true, default: null })
    module_id: number;
    @Index()
    @Column({ type: 'varchar', length: 255, nullable: true, default: null })
    org_activity_id: string;
    @Column({ type: 'int', nullable: true, default: null })
    wellbeing_category_id: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    frequency_base: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    f_type: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    f_range: number;
    @Column({ type: 'int', nullable: true, default: null })
    fpost_id: number;
    @Index()
    @Column({ type: 'int', nullable: true, default: null })
    post_id: number;
    @Index()
    @Column({ type: 'int' })
    block_id: number;
    @Column({ type: 'int' })
    type: number;
    @Column({ type: 'float', nullable: false, default: 0 })
    e_range: number;
    @Column({ type: 'float', nullable: false, default: 0 })
    s_range: number;
    @Column({ type: 'int' })
    days: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    display_type: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    video_second: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    healthplan: number;
    @Column({ type: 'varchar', length: 512, nullable: true, default: null })
    healthplan_name: string;
    @Column({ type: 'varchar', length: 52, nullable: true, default: null })
    button_text: string;
    @Column({ type: 'text' })
    link: string;
    @Column({ type: 'int', nullable: false, default: 0 })
    link_type: number;
    @Column({ type: 'int', nullable: true, default: null })
    link_id: number;
    @Column({ type: 'text', nullable: true, default: null })
    icon: string;
    @Column({ type: 'text', nullable: true, default: null })
    description: string;
    @Column({ type: 'int', nullable: false, default: 0 })
    gender: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    age: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    ageoption: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    age_s_range: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    age_e_range: number;
    @Column({ type: 'int', nullable: true, default: 1 })
    add_image: number;
    @Column({ type: 'text' })
    upload_text: string;
    @Column({ type: 'int', nullable: true, default: 0 })
    add_notes: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    order_id: number;
    @Column({ type: 'int', nullable: false, default: 1 })
    status: number;
    @Index()
    @Column({ type: 'int', nullable: false, default: 0 })
    is_category: number;
    @Column({ type: 'text', nullable: true, default: null })
    option_activity_ids: string;
    @Column({ type: 'int', nullable: true, default: 0 })
    wtype: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    wtypeunit: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    grater_than: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    hide_button: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
