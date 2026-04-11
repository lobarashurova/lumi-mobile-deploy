import * as mongoose from 'mongoose'

async function seed() {
  const uri = process.env.DATABASE_URI || 'mongodb://localhost:27017'
  const db_name = process.env.DATABASE_NAME || 'lumi_mobile'
  const user = process.env.DATABASE_USER
  const pass = process.env.DATABASE_PASSWORD

  const connection_options: mongoose.ConnectOptions = {
    dbName: db_name,
  }

  if (user && pass) {
    connection_options.auth = { username: user, password: pass }
  }

  await mongoose.connect(uri, connection_options)

  // Seed banners
  const banners_collection = mongoose.connection.collection('banners')
  const existing_banners = await banners_collection.countDocuments()

  if (existing_banners === 0) {
    await banners_collection.insertMany([
      {
        image: {
          uz: '/uploads/banner1.jpg',
          ru: '/uploads/banner1.jpg',
          en: '/uploads/banner1.jpg',
        },
        title: {
          uz: 'Lumi platformasiga xush kelibsiz',
          ru: 'Добро пожаловать в Lumi',
          en: 'Welcome to Lumi',
        },
        description: {
          uz: 'Bolalar uchun eng yaxshi mashg\'ulotlar',
          ru: 'Лучшие занятия для детей',
          en: 'Best activities for kids',
        },
        tags: ['welcome'],
        is_active: true,
        is_deleted: false,
        order: 1,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ])
    console.log('Seeded 1 banner')
  } else {
    console.log('Banners already exist, skipping.')
  }

  console.log('\nSeed completed!')

  await mongoose.disconnect()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
