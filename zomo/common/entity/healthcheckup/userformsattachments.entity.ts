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
@Entity({ name: tableConstant.HEALTH_CHECKUP.TBL_HC_USER_FORM_ATTACHMENTS })
export class UserFormsAttachmentsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int'  })
    user_form_id: number;
    @Column( { type: 'varchar', length: 500})
    name: string;
    @Column( { type: 'int', default: 1 })
    status: number;
    @CreateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP' , onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
