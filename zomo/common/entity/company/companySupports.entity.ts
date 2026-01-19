import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
;
;
@Entity(tableConstant.COMPANIES.TBL_COMPANY_SUPPORTS)
export class CompanySupportsEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column()
    org_id: number;
    @Column('varchar',{length: 512})
    title: string;
    @Column('varchar',{length: 512})
    cname: string;
    @Column('varchar',{length: 512})
    email: string;
    @Column('varchar',{length: 512})
    ph_number: string;
    @Column('varchar',{length: 512})
    operation: string;
    @Column('text',{default: null})
    message: string;
    @Column()
    status: number;
    @Column({type: 'int', nullable: true })
    start_day: number;
    @Column({type: 'int', nullable: true })
    end_day: number;
    @Column('text',{default: null})
    start_time: string;
    @Column('text',{default: null})
    end_time: string;
    @Column()
    timezone: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
