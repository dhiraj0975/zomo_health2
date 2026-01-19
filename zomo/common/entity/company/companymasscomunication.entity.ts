import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from "@common-constants";
@Entity(tableConstant.COMPANIES.TBL_C_MASSCOMMUNICATIONS)
export class CompanyMasscommunicationEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer',{ nullable: false})
    org_id: number;
    @Column('integer',{ nullable: false})
    user_id: number;
    @Column('integer',{ nullable: false, default: 11 })
    user_role: number;
    @Column('varchar',{ length: 51, nullable: true, default: null})
    membership_code: string;
    @Column('text',{ nullable: true, default: null})
    condition: string;
    @Column('integer',{ nullable: true, default: 0 })
    campaign_id: number;
    @Column('integer',{ nullable: false, default: 0 })
    event_id: number;
    @Column('text',{ nullable: true, default: null})
    department: string;
    @Column('text',{ nullable: true, default: null})
    location: string;
    @Column('text',{ nullable: true, default: null})
    state: string;
    @Column('text',{ nullable: true, default: null})
    city: string;
    @Column('text',{ nullable: true, default: null})
    subject: string;
    @Column('text',{ nullable: true, default: null})
    message: string;
    @Column({ nullable: true })
    request_date: Date;
    @Column('varchar',{ length: 501, nullable: true, default: null})
    email: string;
    @Column('integer',{ nullable: true, default: null })
    status: number;
    @Column('integer',{ default: 0 })
    flage: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_date: Date;
}
