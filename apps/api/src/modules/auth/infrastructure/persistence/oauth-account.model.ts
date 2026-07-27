import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';
import { UserModel } from '@modules/users/infrastructure/persistence/user.model';
import { OAuthProvider } from '../../domain/entities/oauth-account.entity';

@Table({ tableName: 'oauth_accounts', version: true })
export class OAuthAccountModel extends BaseModel {
  @ForeignKey(() => UserModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare userId: string;

  @Column({ type: DataType.ENUM(...Object.values(OAuthProvider)), allowNull: false })
  declare provider: OAuthProvider;

  @Column({ type: DataType.STRING(255), allowNull: false })
  declare providerAccountId: string;
}
