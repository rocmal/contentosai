import { Global, Module } from '@nestjs/common';
import { PASSWORD_HASHER } from './password-hasher.interface';
import { BcryptPasswordHasher } from './bcrypt-password-hasher';
import { EncryptionService } from './encryption.service';

@Global()
@Module({
  providers: [{ provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher }, EncryptionService],
  exports: [PASSWORD_HASHER, EncryptionService],
})
export class SecurityModule {}
