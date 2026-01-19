import { BaseEntity, PrimaryColumn, Column, Entity } from 'typeorm';
import { tableConstant } from '../constant';
@Entity({ name: tableConstant.TBL_LANG_DESC })
export class LangDescEntity extends BaseEntity {
    @PrimaryColumn({ type: 'varchar', length: 5 })
    Factor_Code: string;
    @Column({ type: 'varchar', length: 140, nullable: true })
    Description: string;
}
