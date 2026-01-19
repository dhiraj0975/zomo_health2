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
@Entity({ name: tableConstant.HEALTH_CHECKUP.TBL_HC_AGE_GENDER_COMPLETE })
export class AgeGenderCompleteEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: false })
    age_activity_id: number;
    @Column('integer', { nullable: false })
    user_id: number;
    @Column('varchar', { nullable: false })
    date: string;
    @Column('integer', { nullable: false })
    reference_id: number;
    @Column('varchar', { nullable: false })
    physician_name: string;
    @Column('varchar', { nullable: false })
    physician_signature: string;
    @Column('integer', { nullable: false, default: () => '1' })
    status: number;
    @Column({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    inserted: Date;
    @Column('integer', { nullable: false })
    created_by: number;
    @Column('integer', { nullable: false })
    updated_by: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
