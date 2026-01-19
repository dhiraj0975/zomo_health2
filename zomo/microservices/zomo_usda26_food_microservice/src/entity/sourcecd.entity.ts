import { BaseEntity, PrimaryColumn, Column, Entity } from 'typeorm';
import { tableConstant } from '../constant';
@Entity({ name: tableConstant.TBL_SRC_CD })
export class SourceCodeEntity extends BaseEntity {
    @PrimaryColumn({ type: 'varchar', length: 2 })
    Src_Cd: string;
    @Column({ type: 'varchar', length: 60 })
    SrcCd_Desc: string;
}
