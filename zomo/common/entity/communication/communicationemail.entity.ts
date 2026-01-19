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
@Entity({ name: tableConstant.COMMUNICATION.TBL_COM_EMAIL })
export class CommunicationEmailEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer',{ nullable: false })
    parent_id: number;
    @Column('integer',{ nullable: false })
    from_user_id: number;
    @Column('text',{ nullable: true })
    subject: string;
    @Column('text',{ nullable: true })
    email_body: string;
    @Column('integer',{ nullable: false })
    is_send: number;
    @Column('integer',{ nullable: false })
    is_spam: number;
    @Column('integer',{ nullable: false })
    is_important: number;
    @Column('integer',{ nullable: false })
    is_attachment: number;
    @Column('integer',{ nullable: false })
    is_trash: number;
    @Column('integer',{ nullable: false })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    modified_date: Date;
}
