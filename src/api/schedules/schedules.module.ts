import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'

import { Activity, ActivitySchema } from 'src/models/activity.schema'
import { Booking, BookingSchema } from 'src/models/booking.schema'
import { Branch, BranchSchema } from 'src/models/branch.schema'

import { SchedulesController } from './schedules.controller'
import { SchedulesService } from './schedules.service'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: Activity.name, schema: ActivitySchema },
      { name: Branch.name, schema: BranchSchema },
    ]),
  ],
  controllers: [SchedulesController],
  providers: [SchedulesService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
