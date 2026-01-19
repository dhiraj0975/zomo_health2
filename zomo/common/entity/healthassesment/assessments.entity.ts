import {
    BaseEntity,
    Column,
    Entity,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
;
;
@Entity({ name: tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENTS })
export class AssessmentsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: false })
    user_id: number;
    @Column('integer', { nullable: false })
    activity_id: number;
    @Column('text', { nullable: false })
    '1': string;
    @Column('float', { nullable: true })
    '1_qscore': number;
    @Column('float', { nullable: false })
    '1_WorstScore': number;
    @Column('text', { nullable: false })
    '2': string;
    @Column('float', { nullable: true })
    '2_qscore': number;
    @Column('float', { nullable: false })
    '2_WorstScore': number;
    @Column('text', { nullable: false })
    '3': string;
    @Column('float', { nullable: true })
    '3_qscore': number;
    @Column('float', { nullable: false })
    '3_WorstScore': number;
    @Column('text', { nullable: false })
    '4': string;
    @Column('float', { nullable: true })
    '4_qscore': number;
    @Column('float', { nullable: false })
    '4_WorstScore': number;
    @Column('text', { nullable: false })
    '5': string;
    @Column('float', { nullable: true })
    '5_qscore': number;
    @Column('float', { nullable: false })
    '5_WorstScore': number;
    @Column('text', { nullable: false })
    '6': string;
    @Column('float', { nullable: true })
    '6_qscore': number;
    @Column('float', { nullable: false })
    '6_WorstScore': number;
    @Column('text', { nullable: false })
    '7': string;
    @Column('text', { nullable: false })
    '8': string;
    @Column('text', { nullable: false })
    '9': string;
    @Column('integer', { nullable: false })
    score: number;
    @Column('text', { nullable: false })
    na: string;
    @Column('integer', { nullable: false })
    hra_status: number;
    @Column('integer', { nullable: false })
    hra_reset: number;
    @Column('integer', { nullable: false })
    language_set: number;
    @Column('timestamp',{ nullable: false })
    date: Date;
    @Column({ type: 'int', default: 1 })
    status: number;
}
