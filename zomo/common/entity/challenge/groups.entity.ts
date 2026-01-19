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
@Entity({ name: tableConstant.CHALLENGE.TBL_CH_GROUPS })
export class GroupsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: false })
    schedule_id: number;
    @Column({ type: 'int', nullable: false })
    org_id: number;
    @Column({ type: 'varchar', length: 256, nullable: false })
    name: string;
    @Column({ type: 'varchar', length: 256, nullable: false })
    logo: string;
    @Column({ type: 'int', nullable: false })
    status: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: null, onUpdate: 'CURRENT_TIMESTAMP' })
    modified_date: Date;
}
