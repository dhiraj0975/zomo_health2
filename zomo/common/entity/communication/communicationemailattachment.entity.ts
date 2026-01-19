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
@Entity({ name: tableConstant.COMMUNICATION.TBL_COM_EMAIL_ATTACHMENT })
export class CommunicationEmailAttachmentEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer',{ nullable: false })
    mail_id: number;
    @Column('integer',{ nullable: false })
    attachment_type_id: number;
    @Column('text',{ nullable: true })
    name: string;
    @Column('integer',{ nullable: false })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    modified_date: Date;
}
