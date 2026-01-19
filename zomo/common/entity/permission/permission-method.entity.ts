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
@Entity(tableConstant.PERMISSION.TBL_METHODS)
export class PermissionMethodEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('text', { nullable: true })
    module: string;
    @Column('text', { nullable: true })
    controller: string;
    @Column('text', { nullable: true })
    action: string;
    @Column('text', { nullable: true })
    method: string;
    @Column('text', { nullable: true })
    path: string;
    @Column('text', { nullable: true })
    slug: string;
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
