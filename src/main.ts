import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import * as basicAuth from 'express-basic-auth'
import { join } from 'path'

import { AppModule } from './app.module'
import { AllExceptionsFilter } from './common/filters/http-exception.filter'
import { TransformResponseInterceptor } from './common/interceptors/response.interceptor'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: {
      credentials: true,
      origin: true,
    },
  })

  app.set('trust proxy', true)

  // Serve uploaded files statically
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  })

  const config_service = app.get<ConfigService>(ConfigService)

  const docs_password = config_service.get<string>('docs_password')
  app.use(
    '/api/docs*',
    basicAuth({
      challenge: true,
      users: {
        admin: docs_password,
      },
    }),
  )

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  app.useGlobalFilters(new AllExceptionsFilter())
  app.useGlobalInterceptors(new TransformResponseInterceptor())

  const swagger_config = new DocumentBuilder()
    .setTitle('Lumi Mobile API')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, swagger_config)
  SwaggerModule.setup('api/docs', app, document)

  await app.listen(3000)
}
bootstrap()
