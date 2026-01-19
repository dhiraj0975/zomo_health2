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
@Entity({ name: tableConstant.BROKER })
export class BrokerEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int' })
    org_id: number;
    @Column({ type: 'int' })
    user_id: number;
    @Column({ type: 'int' })
    broker_admin_id: number;
    @Column({ type: 'int' })
    location: number;
    @Column({ type: 'int' })
    department: number;
    @Column({ type: 'varchar', length: 256 })
    state: string;
    @Column({ type: 'varchar', length: 256 })
    city: string;
    @Column({ type: 'int' })
    is_global: number;
    @Column({ type: 'int', nullable: true })
    region_id: number;
    @Column({ type: 'tinyint', default: 1 })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    modified_date: Date;
}
