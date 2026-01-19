import {BaseEntity, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn} from 'typeorm';
import { tableConstant } from '../../constant';
import { Status} from "../../enum";

@Entity({ name: tableConstant.CHALLENGE.TBL_CH_WEIGHT_REQUEST })
export class WeightRequestEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: true })
    org_id: number;
    @Column('varchar', { length: 501, nullable: true })
    original_file: string;
    @Column('varchar', { length: 501, nullable: true, default: null })
    rejected_file: string;
    @Column('varchar', { length: 501, nullable: true, default: null })
    success_file: string;
    @Column({type: 'enum', enum: Status, default: Status.Zero})
    status: Status;
    @Column({type: 'enum', enum: Status, default: Status.Zero})
    mail_status: Status;
    @Column('text', { nullable: true })
    org_sheet_header: string;
    @Column('text', { nullable: true })
    mapped_header: string;
    @Column('varchar', { length: 255 })
    hash: string;
    @Column('integer', { nullable: true })
    created_by: number;
    @Column('integer', { nullable: true })
    updated_by: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', onUpdate: 'CURRENT_TIMESTAMP', nullable: true, default: null })
    updated: Date;
}
