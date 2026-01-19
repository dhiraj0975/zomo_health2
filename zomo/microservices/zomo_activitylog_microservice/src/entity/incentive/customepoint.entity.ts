import { activityTableConstant } from '@common-constants';
import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
} from 'typeorm';
@Entity({ name: activityTableConstant.TBL_IN_CUSTOM_POINT })
export class CustomPointEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'integer', nullable: false })
    reference_id: number;
    @Column('varchar', { length: 255, default: 'update' })
    event: string;
    @Column('varchar', { length: 255, nullable: false })
    table_name: string;
    @Column('varchar', { length: 255, nullable: false })
    field: string;
    @Column({ type: 'text', nullable: true, default: null })
    instring: string;
    @Column({ type: 'text', nullable: true, default: null })
    outstring: string;
    @Column('varchar')
    remark: string;
    @Column('integer', { nullable: false })
    created_by: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
}
