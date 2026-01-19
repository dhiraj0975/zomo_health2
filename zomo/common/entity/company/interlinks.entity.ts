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
@Entity({ name: tableConstant.COMPANIES.TBL_COMPANY_INTERLINKS })
export class InterlinksEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ length: 255, nullable: true })
    linktitle: string;
    @Column({ length: 100, nullable: true })
    plugin: string;
    @Column({ length: 100, nullable: true })
    controller: string;
    @Column({ length: 100, nullable: true })
    action: string;
    @Column({ length: 255, nullable: true })
    newlink: string;
    @Column({ default: 1 })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    added_date: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_date: Date;
}
