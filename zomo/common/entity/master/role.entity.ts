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
@Entity(tableConstant.MASTER.TBL_ROLES)
export class RoleEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('text', { nullable: true })
    title: string;
    @Column('text', { nullable: true })
    alias: string;
    @Column('integer', { nullable: true })
    role_company_type: number;
    @Column('text', { nullable: true })
    role_desc: string;
    @Column('integer', { nullable: false, default: 1 })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
