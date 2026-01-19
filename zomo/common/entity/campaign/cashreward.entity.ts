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
@Entity({ name: tableConstant.CAMPAIGN.TBL_IN_CASH_REWARD })
export class CashRewardEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: true })
    reward_id: number;
    @Column('varchar', { length: 501, nullable: true })
    cust_name: string;
    @Column('integer', { nullable: true })
    order_id: number;
    @Column('varchar', { length: 101, nullable: true })
    point_user: string;
    @Column('varchar', { length: 101, nullable: true })
    point_spouse: string;
    @Column('varchar', { length: 101, nullable: true })
    amt_user: string;
    @Column('varchar', { length: 101, nullable: true })
    amt_spouse: string;
    @Column('integer', { nullable: true })
    max_point_limit: number;
    @Column('integer', { nullable: true })
    consider_require: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    added_date: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_date: Date;
    @Column('integer', { nullable: true })
    status: number;
}
