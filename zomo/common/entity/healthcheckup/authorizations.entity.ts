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
@Entity({ name: tableConstant.HEALTH_CHECKUP.TBL_HC_AUTHORIZATIONS })
export class AuthorizationsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('int', { nullable: true })
    user_id: number;
    @Column({type: 'varchar', nullable: true, length: 100 })
    signature: string;
    @Column({type: 'varchar', nullable: true, length: 100 })
    type_of_form: string;
    @Column({type: 'varchar', length: 256, nullable: true, default: null })
    user_sign_image: string;
    @Column({ type: 'datetime', nullable: true, default: null })
    date_completed: Date;
    @Column({ type: 'int', nullable: true, default: null })
    activity_id: number;
    @Column({ type: 'int', default: 1 })
    status: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
