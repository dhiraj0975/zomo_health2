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
@Entity({ name: tableConstant.COMPANIES.TBL_COMPANY })
export class CompaniesEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('varchar', { length: 21, nullable: true })
    code: string;
    @Column('integer', { nullable: true })
    companytype_id: number;
    @Column('varchar', { length: 251,nullable: true })
    company_name: string;
    @Column('text', { nullable: true })
    company_logo: string;
    @Column('text', { nullable: true })
    company_logo_dark: string;
    @Column('text', { nullable: true })
    phone: string;
    @Column('text', { nullable: true })
    street_address: string;
    @Column('varchar', { nullable: true })
    state: string;
    @Column('varchar', { nullable: true })
    city: string;
    @Column('varchar', { nullable: true })
    zip: string;
    @Column('varchar', { nullable: true })
    country: string;
    @Column('integer', { nullable: true })
    deleted: number;
    @Column('integer', { default: 0 })
    is_testing: number;
    @Column('integer', { nullable: true })
    status: number;
    @Column('integer', { nullable: true })
    block_email: number;
    @Column('integer', { nullable: true })
    membership_plan_id: number;
    @Column({ default: 0 })
    created_by: number;
    @Column({ default: 0 })
    updated_by: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
