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
@Entity({ name: tableConstant.COVID.COVID_USER_ANSWERS })
export class CovidUserAnswersEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int' })
    org_id: number;
    @Column({ type: 'int' })
    user_id: number;
    @Column({ type: 'text' })
    question_answers: string;
    @Column({ type: 'int', default: 1 })
    status: number;
    @Column({ type: 'int', nullable: false }) 
    are_you_vaccinated: number;
    @Column({ type: 'int', nullable: true })    
    tested_positive_covid: number;
    @Column({ type: 'int', nullable: true }) 
    vaccination_type: number;
   @Column({ type: 'text' })
    vecctionationrecord: string;
   @Column({ type: 'text' })
    testpositivecertificate: string;
   @Column({ type: 'text' })
    lastvaccinationdate: string;
   @Column({ type: 'text' })
   lastreportdate: string;
    @Column({ type: 'int' })
    created_by: number;
    @Column({ type: 'int', default: 0 })
    updated_by: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
