import * as Joi from 'joi'

export const validation_schema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_URI: Joi.string().required(),
  DATABASE_USER: Joi.string().optional().allow(''),
  DATABASE_PASSWORD: Joi.string().optional().allow(''),
  JWT_SECRET: Joi.string().required(),
  DOCS_PASSWORD: Joi.string().required(),
  SMS_API_KEY: Joi.string().optional().allow(''),
  SMS_API_SECRET: Joi.string().optional().allow(''),
  SMS_API_URL: Joi.string().optional().allow(''),
})

export const configuration = () => ({
  env: process.env.NODE_ENV,
  port: parseInt(process.env.PORT, 10),
  database: {
    uri: process.env.DATABASE_URI,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    name: process.env.DATABASE_NAME,
  },
  jwt_secret: process.env.JWT_SECRET,
  docs_password: process.env.DOCS_PASSWORD,
  sms: {
    api_key: process.env.SMS_API_KEY,
    api_secret: process.env.SMS_API_SECRET,
    api_url: process.env.SMS_API_URL,
  },
})

export default {
  isGlobal: true,
  load: [configuration],
  validationSchema: validation_schema,
  validationOptions: {
    abortEarly: true,
  },
}
