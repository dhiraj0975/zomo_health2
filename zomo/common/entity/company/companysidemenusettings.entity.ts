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
@Entity(tableConstant.COMPANIES.TBL_COMPANY_SIDE_MENU_SETTINGS)
export class CompanySideMenuSettingsEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({type: 'int', nullable: true })
    org_id: number;
    @Column({ type: 'text', nullable: true })
    datasettingmenu: string;
    @Column({ type: 'text', nullable: true })
    showmenulist: string;
    @Column('integer', { default: 0 })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_date: Date;
}
