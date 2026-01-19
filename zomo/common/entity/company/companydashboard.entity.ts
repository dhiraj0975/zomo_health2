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
@Entity({ name: tableConstant.COMPANIES.TBL_COMPANY_DASHBOARD })
export class CompanyDashboardEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int' })
    org_id: number;
    @Column({ type: 'text' })
    square_img: string;
    @Column({ type: 'text' })
    square_img_link: string;
    @Column({ type: 'text' })
    square_img_link_isin: string;
    @Column({ type: 'text' })
    square_img_link_id: string;
    @Column({ type: 'text' })
    mob_square_img: string;
    @Column({ type: 'int', default: 1 })
    status: number;
    @Column({ type: 'int', default: 0 })
    added_by: number;
    @Column({ type: 'int', default: 0 })
    reference_id: number;
    @Column({ type: 'int', default: 0 })
    displaybasedon: number;
    @Column('datetime', { nullable: true })
    from_date: Date;
    @Column('datetime', { nullable: true })
    to_date: Date;
    @Column({ type: 'int', default: 0 })
    image_order: number;
    @Column({ type: 'int', default: 1 })
    imglug_id: number;
    @Column({ type: 'int', default: 1 })
    imgopt_id: number;
    @Column({ type: 'int', nullable: true })
    square_img_activity: number;
    @Column({ type: 'int', default: 0 })
    dimg_eligibility: number;
    @Column({ type: 'int', default: 0 })
    dimg_visibility: number;
    @Column({ type: 'longtext', nullable: true })
    dimg_visibility_ids: string;
    @Column({ type: 'int', default: 0 })
    dimg_healthplan: number;
    @Column({ type: 'longtext', nullable: true })
    dimg_healthplanname: string;
    @Column('varchar', { length: 15, nullable: true })
    square_img_back_color: string;
    @Column('varchar', { length: 15, nullable: true })
    square_img_icon_color: string;
    @Column('varchar', { length: 255, nullable: true })
    square_img_text: string;
    @Column('varchar', { length: 15, nullable: true })
    square_img_text_color: string;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
