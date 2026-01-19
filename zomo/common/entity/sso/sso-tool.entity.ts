import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
import { Status} from "../../enum";

@Entity({ name: tableConstant.SSO.TBL_SSO_TOOL })
export class SsoToolEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('varchar',{ length: 255 })
    tool_name: string;
    @Column({ type: 'json', nullable: true })
    tool_detail: Record<string, string>;
    @Column({type: 'enum', enum: Status, default: Status.One})
    status: Status;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
