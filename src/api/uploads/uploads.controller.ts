import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { InjectConnection } from '@nestjs/mongoose'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Response } from 'express'
import { GridFSBucket } from 'mongodb'
import { Connection } from 'mongoose'
import { memoryStorage } from 'multer'
import { extname } from 'path'

import { Public } from 'src/common/decarators/public.decarator'

const ALLOWED = /\.(jpg|jpeg|png|gif|webp|svg)$/i

function bucket(conn: Connection): GridFSBucket {
  if (!conn.db) throw new Error('Mongo connection not ready')
  return new GridFSBucket(conn.db, { bucketName: 'uploads' })
}

@Controller('/api/uploads')
export class UploadsController {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED.test(extname(file.originalname))) {
          return cb(
            new BadRequestException('Only image files are allowed'),
            false,
          )
        }
        cb(null, true)
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required')

    const filename = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}${extname(file.originalname)}`

    const stream = bucket(this.conn).openUploadStream(filename, {
      contentType: file.mimetype,
    })
    stream.end(file.buffer)

    await new Promise<void>((resolve, reject) => {
      stream.once('finish', () => resolve())
      stream.once('error', reject)
    })

    return {
      url: `/uploads/${filename}`,
      filename,
      originalname: file.originalname,
      size: file.size,
    }
  }
}

@Controller('/uploads')
export class UploadsServeController {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  @Public()
  @Get(':filename')
  async serve(
    @Param('filename') filename: string,
    @Res() res: Response,
  ): Promise<void> {
    const b = bucket(this.conn)
    const files = await b.find({ filename }).limit(1).toArray()
    if (!files.length) throw new NotFoundException('File not found')
    const f = files[0]
    res.setHeader(
      'Content-Type',
      f.contentType || 'application/octet-stream',
    )
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    b.openDownloadStream(f._id).pipe(res)
  }
}
