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
@Entity({ name: tableConstant.COACH.TBL_CO_COACHES })
export class CoachesEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: true })
    org_id: number;
    @Column('integer', { nullable: true })
    user_id: number;
    @Column('integer', { nullable: true })
    coach_manager_id: number;
    @Column('integer', { nullable: true })
    location: number;
    @Column('integer', { nullable: true })
    department: number;
    @Column('varchar',{ length: 255, nullable: false })
    state: string;
    @Column('varchar',{ length: 255, nullable: false })
    city: string;
    @Column('integer', { nullable: true })
    is_global: number;
    @Column('integer', { nullable: false, default: 1 })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    modified_date: Date;
}
