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
@Entity({ name: tableConstant.TBL_SPOUSE })
export class SpouseEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('varchar',{ length: 100 })
    firstname: string;
    @Column('varchar',{ length: 100 })
    lastname: string;
    @Column('varchar',{ length: 100 })
    email: string;
    @Column('varchar',{ length: 100 })
    relationship_id: string;
    @Column('varchar',{ length: 100 })
    activation_key: string;
    @Column({ type: 'int', default: 1 })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
