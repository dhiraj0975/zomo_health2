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
@Entity({ name: tableConstant.CHALLENGE.TBL_CH_MOVE_MORE_PARKS })
export class MoveMoreParksEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: true })
    org_id: number;
    @Column({ type: 'int', nullable: true })
    schedule_id: number;
    @Column({ type: 'varchar', length: 255, nullable: true })
    park_name: string;
    @Column({ type: 'text', nullable: true })
    image: string;
    @Column({ type: 'int', nullable: true })
    steps: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    order_by: number;
    @Column({ type: 'varchar', length: 255, nullable: true, default: null })
    corner: string;
    @Column({ type: 'text', nullable: true, default: null })
    map: string;
    @Column({ type: 'text', nullable: true, default: null })
    website: string;
    @Column({ type: 'text', nullable: true, default: null })
    info: string;
    @Column({ type: 'int', default: 1 })
    status: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: null, onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
