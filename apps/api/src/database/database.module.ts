import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { Dialect } from 'sequelize';

/**
 * Owns the single database connection for the whole application. Every
 * database-specific detail (dialect, host, credentials) is resolved from
 * config here and nowhere else - swapping MySQL for PostgreSQL only requires
 * changing DB_DIALECT/env vars, never touching feature-module code.
 */
@Module({
  imports: [
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        dialect: config.get<string>('database.dialect') as Dialect,
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.user'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        logging: config.get<boolean>('database.logging') ? console.log : false,
        pool: config.get('database.pool'),
        autoLoadModels: true,
        synchronize: false,
        define: {
          underscored: false,
          timestamps: true,
          paranoid: true,
        },
      }),
    }),
  ],
})
export class DatabaseModule {}
