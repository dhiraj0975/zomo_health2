import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
@Entity(tableConstant.COMPANIES.TBL_COMPANY_WELLNESS_ASSIGNMENTS)
export class WellnessAssignmentEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer')
    org_id: number;
    @Column('integer')
    user_id: number;
    @Column('integer')
    location: number;
    @Column('integer')
    department: number;
    @Column('varchar', { length: 256 })
    state: string;
    @Column('varchar', { length: 256 })
    city: string;
    @Column('integer')
    is_global: number;
    @Column('integer',{ nullable: true })
    img_option: number;
    @Column('integer')
    img_area: number;
    @Column('integer')
    slider_limit: number;
    // @Column('varchar', { length: 256, nullable: true })
    // big_img: string;
    // @Column('varchar', { length: 256, nullable: true })
    // big_img_link: string;
    // @Column('integer')
    // big_img_link_isin: number;
    // @Column('integer',{ nullable: true })
    // big_img_link_id: number;
    // @Column('varchar', { length: 256, nullable: true })
    // square_img1: string;
    // @Column('varchar', { length: 256, nullable: true })
    // square_img_link1: string;
    // @Column('integer')
    // square_img_link1_isin: number;
    // @Column('integer',{ nullable: true })
    // square_img_link1_id: number;
    // @Column('varchar', { length: 256, nullable: true })
    // square_img2: string;
    // @Column('varchar', { length: 256, nullable: true })
    // square_img_link2: string;
    // @Column('integer')
    // square_img_link2_isin: number;
    // @Column('integer',{ nullable: true })
    // square_img_link2_id: number;
    // @Column('varchar', { length: 256, nullable: true })
    // square_img3: string;
    // @Column('varchar', { length: 256, nullable: true })
    // square_img_link3: string;
    // @Column('integer')
    // square_img_link3_isin: number;
    // @Column('integer',{ nullable: true })
    // square_img_link3_id: number;
    // @Column('varchar', { length: 256, nullable: true })
    // square_img4: string;
    // @Column('varchar', { length: 256, nullable: true })
    // square_img_link4: string;
    // @Column('integer')
    // square_img_link4_isin: number;
    // @Column('integer',{ nullable: true })
    // square_img_link4_id: number;
    // @Column('varchar', { length: 256, nullable: true })
    // mob_big_img: string;
    // @Column('varchar', { length: 256, nullable: true })
    // mob_square_img1: string;
    // @Column('varchar', { length: 256, nullable: true })
    // mob_square_img2: string;
    // @Column('varchar', { length: 256, nullable: true })
    // mob_square_img3: string;
    // @Column('varchar', { length: 256, nullable: true })
    // mob_square_img4: string;
    // @Column('integer',{ nullable: true })
    // square_img_activity1: number;
    // @Column('integer',{ nullable: true })
    // square_img_activity2: number;
    // @Column('integer',{ nullable: true })
    // square_img_activity3: number;
    // @Column('integer',{ nullable: true })
    // square_img_activity4: number;
    @Column('integer',{default: 1})
    status: number;
    @Column('integer',{default: 0})
    eligibility: number;
    @Column('integer',{default: 1})
    imglug_id: number;

    @Column('varchar', { length: 512, nullable: true })
    company_logo: string;

    @Column('varchar', { length: 512, nullable: true })
    company_logo_dark: string;

    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    modified_date: Date;
}
