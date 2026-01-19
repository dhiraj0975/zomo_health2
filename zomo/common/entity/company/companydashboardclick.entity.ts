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
@Entity({ name: tableConstant.COMPANIES.TBL_COMPANY_DASHBOARD_CLICKS })
export class CompanyDashboardClickEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('int',{ default: 0 })
    user_id: number;
    @Column('int',{ default: 0 })
    type: number;
    @Column('int',{ default: 0 })
    ref_id: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_date: Date;
    @Column({ type: 'int', default: 0 })
    status: number;
    @Column({ type: 'int', default: 0 })
    source: number;
}
