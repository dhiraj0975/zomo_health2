import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
;
;
@Entity({ name: tableConstant.DEVICE_CONFIGURATION.TBL_DC_AUTHORIZED_USERS })
export class AuthorizedUsersEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: false })
    user_id: number;
    @Column('varchar',{ nullable: false, length: 255 })
    username: string;
    @Column('varchar',{ nullable: false, length: 10 })
    statusDevice: string;
    @Column('varchar',{ nullable: false, length: 255 })
    consumer_key: string;
    @Column('varchar',{ nullable: false, length: 255 })
    consumer_secret: string;
    @Column('varchar',{ nullable: false, length: 255 })
    token_key: string;
    @Column('varchar',{ nullable: false, length: 255 })
    token_secret: string;
    @Column('varchar',{ nullable: false, length: 255 })
    refresh_token: string;
    @Column('varchar',{ nullable: false, length: 200 })
    app_name: string;
    @Column('varchar',{ nullable: false, length: 255 })
    app_id: string;
    @Column('integer',{ nullable: false })
    device_id: number;
    @Column('varchar',{ nullable: false, length: 100 })
    user_timezone: string;
    @CreateDateColumn({ nullable: false, default: () => 'CURRENT_TIMESTAMP' })
    date_time: number;
    @Column('integer',{ nullable: false })
    created: number;
    @Column({ type: 'int', default: 1 })
    status: number;
    // @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    // modified: Date;
}
