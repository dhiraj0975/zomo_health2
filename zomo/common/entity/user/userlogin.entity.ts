import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
import { Source } from '../../enum';
@Entity({ name: tableConstant.TBL_USERS_LOGIN })
export class UserLoginEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: true })
    user_id: number;
    @Column('varchar', { nullable: true })
    ip: string;
    @Column('varchar', { nullable: true })
    city: string;
    @Column('varchar', { nullable: true })
    region: string;
    @Column('varchar', { nullable: true })
    country: string;
    @Column('varchar', { nullable: true })
    zipcode: string;
    @Column('varchar', { nullable: true })
    latitude: string;
    @Column('varchar', { nullable: true })
    longitude: string;
    @Column('varchar', { nullable: true })
    timezone: string;
    @Column('varchar', { nullable: true })
    useragent: string;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    login_time: Date;
    @UpdateDateColumn({ type:'timestamp' })
    logout_time: Date;
    @Column({
        type: 'enum',
        enum: Source,
        default: Source.Web,
    })
    source: Source;
    @Column({ type: 'int', default: 0 })
    login_source: number;
    @Column({ type: 'int', default: 1 })
    status: number;
    // @ManyToOne(() => UserEntity, (user) => user.id)
    // @JoinColumn({ name: 'user_id' })
    // user: UserEntity;
}
