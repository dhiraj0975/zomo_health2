import { BaseEntity, PrimaryColumn, Entity, Column } from 'typeorm';
import { tableConstant } from '../constant';
@Entity({ name: tableConstant.TBL_LANGUAL })
export class LangualEntity extends BaseEntity {
    @PrimaryColumn({ type: 'varchar', length: 5 })
    NDB_No: string;
    @Column({ type: 'varchar', length: 5 })
    Factor_Code: string;
}
