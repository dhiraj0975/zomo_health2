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
@Entity({ name: tableConstant.REGION.REGION_STATE_CITY })
export class RegionStateCityEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: true })
    region_id: number;
    @Column({ type: 'varchar', length: 500, nullable: true })
    state: string;
    @Column({ type: 'varchar', length: 500, nullable: true })
    city: string;
    @Column({ type: 'int', default: 1 })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    modified_date: Date;
}
