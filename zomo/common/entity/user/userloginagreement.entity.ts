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
@Entity({ name: tableConstant.TBL_USER_LOGIN_AGREEMENT })
export class UserLoginAgreementEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: false })
    org_id: number;
    @Column('integer', { nullable: false })
    user_id: number;
    @Column('varchar', { length: 256, nullable: false })
    user_sign: string;
    @Column('varchar', { length: 256, nullable: true })
    user_sign_image: string;
    @Column('integer', { default: 1 })
    status: number;
    @CreateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    update: Date;
}
