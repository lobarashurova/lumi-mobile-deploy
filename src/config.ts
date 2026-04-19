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
  SMS_URL: Joi.string().optional().allow('').default('https://notify.eskiz.uz'),
  SMS_EMAIL: Joi.string().optional().allow(''),
  SMS_PASSWORD: Joi.string().optional().allow(''),
  SMS_FROM: Joi.string().optional().allow('').default('4546'),
  SMS_CALLBACK_URL: Joi.string().optional().allow(''),
  PAYCOM_USERNAME_ID: Joi.string().optional().allow('').default('Paycom'),
  PAYCOM_MERCHANT_ID: Joi.string().optional().allow(''),
  PAYCOM_API_KEY: Joi.string().optional().allow(''),
  PAYCOM_CHECKOUT_URL: Joi.string().optional().allow('').default('https://checkout.paycom.uz'),
  PAYCOM_CHECKOUT_REDIRECT_URL: Joi.string().optional().allow(''),
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
    url: process.env.SMS_URL,
    email: process.env.SMS_EMAIL,
    password: process.env.SMS_PASSWORD,
    from: process.env.SMS_FROM,
    callback_url: process.env.SMS_CALLBACK_URL,
  },
  paycom: {
    username: process.env.PAYCOM_USERNAME_ID || 'Paycom',
    merchant_id: process.env.PAYCOM_MERCHANT_ID,
    api_key: process.env.PAYCOM_API_KEY,
    checkout_url: process.env.PAYCOM_CHECKOUT_URL || 'https://checkout.paycom.uz',
    redirect_url: process.env.PAYCOM_CHECKOUT_REDIRECT_URL,
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
