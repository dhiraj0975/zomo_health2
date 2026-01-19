import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
@Entity({ name: tableConstant.REPORT.TBL_C_CENSUS_CUSTOM_FIELDS_VALUES })
export class CensusCustomFieldsValuesEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'bigint' })
    id: number;
    @Column({ type: 'bigint' })
    organization_id: number;
    @Column({ type: 'bigint' })
    user_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    field_id	: number;
    @Column({ type: 'varchar', length: 255, nullable: true, default: null })
    field_value: string;
    @Column({ type: 'int', default: 1 })
    status: number;
    @Column({ type: 'int', nullable: true, default: null })
    created_by: number;
    @Column({ type: 'int', nullable: true, default: null })
    updated_by: number;
    @CreateDateColumn({type: 'timestamp', default: () => 'CURRENT_TIMESTAMP',})
    created: Date;
    @UpdateDateColumn({type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP',})
    updated: Date;
}
