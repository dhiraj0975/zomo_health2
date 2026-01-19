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
@Entity({ name: tableConstant.TBL_USERS_TOKEN })
export class UserTokenEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: true })
    user_id: number;
    @Column('varchar', { nullable: true })
    webToken: string;
    @Column('varchar', { nullable: true })
    appKey: string;
    @Column('varchar', { nullable: true })
    appToken: string;
    @CreateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
