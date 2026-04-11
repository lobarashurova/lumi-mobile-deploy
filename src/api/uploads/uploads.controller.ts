import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname, join } from 'path'

const UPLOAD_DIR = join(process.cwd(), 'uploads')

@Controller('/api/uploads')
export class UploadsController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => {
          const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${extname(file.originalname)}`
          cb(null, uniqueName)
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (_req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|gif|webp|svg)$/i
        if (!allowed.test(extname(file.originalname))) {
          return cb(
            new BadRequestException('Only image files are allowed'),
            false,
          )
        }
        cb(null, true)
      },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required')
    }

    return {
      url: `/uploads/${file.filename}`,
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
    }
  }
}
