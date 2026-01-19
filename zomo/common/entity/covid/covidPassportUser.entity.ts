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
@Entity({ name: tableConstant.COVID.COVID_PASSPORT_USER })
export class CovidPassportUserEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'varchar', length: 256, nullable: true })
    title: string;
    @Column({ type: 'text', nullable: true })
    attachment: string;
    @Column({ type: 'text', nullable: true })
    description: string;
    @Column({ type: 'int' })
    org_id: number;
    @Column({ type: 'int', default: 0 })
    approval_status: number;
    @Column({ type: 'int', nullable: true })
    created_by: number;
    @Column({ type: 'int', default: 1 })
    status: number;
    @Column({ type: 'int', default: 0 })
    is_show_dashboard: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
