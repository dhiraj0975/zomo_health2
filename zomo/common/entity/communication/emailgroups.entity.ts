import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
@Entity({ name: tableConstant.COMMUNICATION.TBL_COM_EMAIL_GROUPS })
export class EmailGroupsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('varchar', { length: 1000, nullable: true })
    group_name: string;
    @Column('longtext', { nullable: true })
    orgs_ids: string;
    @Column('integer', { nullable: false })
    role_id: number;
    @Column('integer', { nullable: true, default: 1 })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP', select: false })
    created_date: Date;
    @Column('integer', { nullable: true, default: null })
    created_by: number;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP', select: false})
    updated_date: Date;
    @Column('integer', { nullable: true, default: null })
    updated_by: number;
}
