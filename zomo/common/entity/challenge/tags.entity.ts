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
@Entity(tableConstant.CHALLENGE.TBL_CH_TAGS)
export class ChallengeTagsEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('varchar',{ length: 255, nullable: false })
    title: string;
    @Column('integer', { default: 1 })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
