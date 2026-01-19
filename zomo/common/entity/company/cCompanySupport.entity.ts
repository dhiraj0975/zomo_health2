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
@Entity({ name: tableConstant.COMPANIES.TBL_C_COMPANY_SUPPORT })
export class cCompanySupport extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: true })
    org_id: number;
    @Column('text',{ nullable: true,default: null})
    program_eligibility	: string;
    @Column('text',{ nullable: true,default: null})
    support_team_authorized_create_user_accounts	: string;
    @Column('text',{ nullable: true,default: null})
    hr_team_department_name	: string;
    @Column('text',{ nullable: true,default: null})
    hr_team_department_email	: string;
    @Column('text',{ nullable: true,default: null})
    redirect_to_hr_team_conditions	: string;
    @Column('text',{ nullable: true,default: null})
    spouse_participation_required_for_incentive	: string;
    @Column('text',{ nullable: true,default: null})
    program_deadline_date	: string;
    @Column('text',{ nullable: true,default: null})
    silent_deadline_date	: string;
    @Column('text',{ nullable: true,default: null})
    accepted_physician_forms	: string;
    @Column('text',{ nullable: true,default: null})
    support_team_authorized_award_points	: string;
    @Column('text',{ nullable: true,default: null})
    other: string;
    @Column({ type: 'int', default: 1 })
    status: number;
    @Column({ type: 'int',  default: 0 })
    created_by: number;
    @Column({ type: 'int',  default: 0 })
    updated_by: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
