import {
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { MongooseModule } from '@nestjs/mongoose'
import { ThrottlerModule } from '@nestjs/throttler'

import { AuthGuard } from 'src/api/auth/auth.guard'
import { AuthModule } from 'src/api/auth/auth.module'
import { RolesGuard } from 'src/api/auth/role.guard'

import { BannersModule } from './api/banners/banners.module'
import { ProfileModule } from './api/profile/profile.module'
import { UploadsModule } from './api/uploads/uploads.module'
import configuration from './config'
import { LoggerMiddleware } from './middlewares/request-logger'
import { SharedModule } from './shared/shared.module'

@Module({
  imports: [
    ConfigModule.forRoot(configuration),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        uri: config.get('database.uri'),
        user: config.get('database.user'),
        pass: config.get('database.password'),
        dbName: config.get('database.name'),
      }),
      inject: [ConfigService],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        global: true,
        secret: configService.get<string>('jwt_secret'),
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    AuthModule,
    SharedModule,
    BannersModule,
    ProfileModule,
    UploadsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*')
  }
}
