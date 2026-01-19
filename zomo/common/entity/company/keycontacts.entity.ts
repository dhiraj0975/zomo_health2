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
@Entity({ name: tableConstant.COMPANIES.TBL_KEY_CONTACT })
export class KeyContactsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: true })
    company_id: number;
    @Column('text', { nullable: true })
    hr_pri_contact: string;
    @Column('text', { nullable: true })
    hr_contact: string;
    @Column('text', { nullable: true })
    hr_email: string;
    @Column('text', { nullable: true })
    tech_contact: string;
    @Column('text', { nullable: true })
    tech_email: string;
    @Column('text', { nullable: true })
    tobacco_contact: string;
    @Column('text', { nullable: true })
    tobacco_email: string;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @Column('integer', { nullable: true })
    created_by: number;
    @Column({ type: 'int', default: 1 })
    status: number;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
    @Column('integer', { nullable: true })
    updated_by: number;
}
