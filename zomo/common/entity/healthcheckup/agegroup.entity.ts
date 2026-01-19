import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
import { Gender } from '../../enum';
@Entity({ name: tableConstant.HEALTH_CHECKUP.TBL_HC_AGE_GROUP })
export class AgeGroupEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('text', { nullable: false })
    group_name: string;
    @Column({
        type: 'enum',
        enum: Gender,
        default: null,
    })
    gender: Gender;
    @Column('integer', { nullable: false, default: 0 })
    group_min_age: number;
    @Column('integer', { nullable: false, default: 0 })
    group_max_age: number;    
    @Column('integer', { nullable: false, default: 1 })
    created_by: number;
    @Column({ type: 'int', nullable: false, default: 1 })
    status: number;    
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
