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
@Entity(tableConstant.QUICK_LINK.TBL_QUICK_LINK_ORGLISTS)
export class QuickLinkOrgListsEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: true })
    c_companies_id: number;
    @Column('integer', { nullable: true })
    quicklink_id: number;
    @Column('integer', { nullable: true, default: 1 })
    status: number;
    @Column('integer', { nullable: true })
    created_by: number;
    @Column('integer', { nullable: true })
    updated_by: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    update: Date;
}
