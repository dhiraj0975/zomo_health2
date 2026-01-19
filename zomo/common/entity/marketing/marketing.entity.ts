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
@Entity({ name: tableConstant.TBL_MARKETING })
export class MarketingEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'varchar', nullable: false })
    email: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    name: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    company: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    mobile: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    message: string;
    @Column({ type: 'int', nullable: true, default: 0 })
    subscribe: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: null, onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
