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
@Entity({ name: tableConstant.COMMUNICATION.TBL_COM_EMAIL_ATTACHMENT_TYPE })
export class CommunicationEmailAttachmentTypeEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('varchar',{ length: 500, nullable: false })
    type: string;
    @Column('text',{ nullable: false })
    mime: string;
    @Column('text',{ nullable: true })
    icon: string;
    @Column('varchar',{ length: 100, nullable: false })
    extension: string;
    @Column('integer',{ nullable: false })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    modified_date: Date;
}
