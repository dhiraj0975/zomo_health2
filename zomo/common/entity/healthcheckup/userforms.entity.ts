import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
@Entity({ name: tableConstant.HEALTH_CHECKUP.TBL_HC_USER_FORMS })
export class UserFormsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column( { type: 'int' })
    org_id: number;
    @Column({ type: 'text' , nullable: true, default: null })
    is_history: string;
    @Column( { type: 'int' })
    user_id: number;
    @Column( { type: 'int' })
    form_id: number;
    @Column({ type: 'varchar', length: 500})
    zip_filename: string;
    @Column({ type: 'text', nullable: true, default: null })
    decline_reason: string;
    @Column({ type: 'int' })
    status: number;
    @Column({ type: 'int', default: 0 })
    popup_status: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    added_date: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP' , onUpdate: 'CURRENT_TIMESTAMP'})
    updated_date: Date;
}
