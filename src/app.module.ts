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
import { BranchesModule } from './api/branches/branches.module'
import { CategoriesModule } from './api/categories/categories.module'
import { ChildrenModule } from './api/children/children.module'
import { AdminSeedModule } from './api/admin-seed/admin-seed.module'
import { ClassesModule } from './api/classes/classes.module'
import { DiscoveryModule } from './api/discovery/discovery.module'
import { OrdersModule } from './api/orders/orders.module'
import { PaycomApiModule } from './api/paycom/paycom.module'
import { ProfileModule } from './api/profile/profile.module'
import { TariffsModule } from './api/tariffs/tariffs.module'
import { UploadsModule } from './api/uploads/uploads.module'
import { UsersModule } from './api/users/users.module'
import configuration from './config'
import { LoggerMiddleware } from './middlewares/request-logger'
import { PaycomModule } from './services/paycom/paycom.module'
import { SmsModule } from './services/sms/sms.module'
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
    SmsModule,
    PaycomModule,
    SharedModule,
    AdminSeedModule,
    BannersModule,
    BranchesModule,
    CategoriesModule,
    ChildrenModule,
    ClassesModule,
    DiscoveryModule,
    OrdersModule,
    PaycomApiModule,
    ProfileModule,
    TariffsModule,
    UploadsModule,
    UsersModule,
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
