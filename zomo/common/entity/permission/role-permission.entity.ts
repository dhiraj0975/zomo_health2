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
@Entity(tableConstant.PERMISSION.TBL_ROLE)
export class RolePermissionEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: true })
    role_id: number;
    @Column('integer', { nullable: true })
    method_id: number;
    @Column('boolean', { nullable: true })
    permission: boolean;
    @Column('integer', { nullable: true })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @Column('integer', { nullable: true })
    created_by: number;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    modified: Date;
    @Column('integer', { nullable: true })
    modified_by: number;
}
