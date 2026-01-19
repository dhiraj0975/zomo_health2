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
@Entity({ name: tableConstant.COMMUNICATION.TBL_COM_TEMPLATE_TEXTS })
export class CommunicationTemplateTextsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: false })
    org_id: number;
    @Column('integer', { nullable: false })
    type: number;
    @Column('text',{ nullable: false })
    text: string;
    @Column('text',{ nullable: true })
    new_text: string;
    @Column({ type: 'int', nullable: false })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
