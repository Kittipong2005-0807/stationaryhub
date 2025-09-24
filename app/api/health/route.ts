import { NextResponse } from 'next/server'
import { ThaiTimeUtils } from '@/lib/thai-time-utils'

export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    timestamp: ThaiTimeUtils.getCurrentThaiTimeISO(),
    message: 'Server is running' 
  })
}
