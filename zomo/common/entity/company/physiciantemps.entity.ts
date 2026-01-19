import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
;
;
@Entity({ name: tableConstant.COMPANIES.TBL_COMPANY_PHYSICIAN_TEMPS })
export class PhysicianTempsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column()
    user_id: number;
    @Column({ length: 50 })
    first_name: string;
    @Column({ length: 50 })
    last_name: string;
    @Column()
    physiciantype_id: number;
    @Column({ length: 100 })
    pname: string;
    @Column({ length: 100 })
    email: string;
    @Column({ length: 15 })
    wphone: string;
    @Column({ length: 255 })
    signature: string;
    @Column({ type: 'datetime', nullable: true })
    physician_date: Date;
    @Column()
    create_account: number;
    @Column({ type: 'int', default: 1 })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
}
