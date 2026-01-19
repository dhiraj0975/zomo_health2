import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
import {Status} from "../../enum";
@Entity({ name: tableConstant.SSO.TBL_SSO_ORG_MAPPING })
export class SsoOrgMappingEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({type: 'int'})
    org_id: number;
    @Column({type: 'int'})
    tool_id: number;
    @Column({ type: 'json', nullable: true })
    saml: Record<string, string>;
    @Column({ type: 'json', nullable: true })
    field_identifier: Record<string, string>;
    @Column({type: 'enum', enum: Status, default: Status.One})
    status: Status;
    @Column({ type: 'int',default: 0 })
    created_by: number;
    @Column({ type: 'int', default: 0 })
    updated_by: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
