
import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
import { Enum } from '../../enum';
;
@Entity({ name: tableConstant.COMPANIES.TBL_GLOBAL_ACCESS })
export class GlobalAccessEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'varchar', length: 250 })
    alias: string;
    @Column({ type: 'json' })
    detail_description: JSON;
    @Column({type: 'int', nullable: true, default: null })
    created_by: number;
    @Column({type: 'int', nullable: true, default: null })
    updated_by: number;
    @Column({type: 'enum', enum: Enum, default: Enum.One})
    status: Enum;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', onUpdate: 'CURRENT_TIMESTAMP', nullable: true, default: null })
    updated: Date;
}
