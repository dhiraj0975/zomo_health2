import { BaseEntity, PrimaryColumn, Column, Entity } from 'typeorm';
import { tableConstant } from '../constant';
@Entity({ name: tableConstant.TBL_FOOD_NOTE })
export class FootNoteEntity extends BaseEntity {
    @PrimaryColumn({ type: 'varchar', length: 5 })
    NDB_No: string;
    @PrimaryColumn({ type: 'varchar', length: 4 })
    Footnt_No: string;
    @Column({ type: 'varchar', length: 1 })
    Footnt_Typ: string;
    @Column({ type: 'varchar', length: 3, nullable: true })
    Nutr_No: string;
    @Column({ type: 'varchar', length: 200 })
    Footnt_Txt: string;
}
