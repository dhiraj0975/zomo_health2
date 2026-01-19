import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { tableConstant } from '../constant';
import { Status } from "../enum/enum";
@Entity({ name: tableConstant.TBL_TIMEZONES })
export class TimezonesEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'varchar', length: 50 })
    timezone_name: string;
    @Column({ type: 'varchar', length: 200 })
    timezone_desc: string;
    @Column({ type: 'varchar', length: 200 })
    timezone_value: string;
    @Column({ type: 'varchar', length: 50 })
    alias: string;
    @Column({ type: 'enum', nullable: false, enum: Status, default: Status.One })
    status: Status;
}
