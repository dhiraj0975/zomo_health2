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
@Entity({ name: tableConstant.COMPANIES.TBL_DEPARTMENT })
export class DepartmentsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: true })
    company_id: number;
    @Column('text', { nullable: true })
    code: string;
    @Column('text', { nullable: true })
    dept_name: string;
    @Column('text', { nullable: true })
    dept_desc: string;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
    @Column('integer', { nullable: true })
    status: number;
    @Column('integer', { nullable: true })
    deleted: number;
    @Column('text', { nullable: true, default: 'No' })
    default_dept: string;
}
