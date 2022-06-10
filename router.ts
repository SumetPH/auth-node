import express, { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { google } from 'googleapis'
import { auth } from './middleware/auht'

const router = express.Router()
const prisma = new PrismaClient()
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URL
)

router.get('/', async (req: Request, res: Response) => {
  return res.json('Hello World.')
})

router.post('/register', async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      name: string
      email: string
      password: string
    }
    // check email
    const checkEmail = await prisma.user.findUnique({
      where: {
        email: body.email,
      },
    })
    if (checkEmail) return res.status(400).json({ message: 'Email exits!' })
    // hash password
    const hash = await bcrypt.hash(body.password, 10)
    // create new user
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: hash,
        provider: 'local',
      },
    })
    // generate token
    const token = await jwt.sign(user, String(process.env.JWT_SECRET_KEY))
    return res.json({ token: token })
  } catch (error: any) {
    console.log(error.message)
    return res.status(500).json({ message: error.message })
  }
})

router.post('/login', async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      email: string
      password: string
    }
    // check email
    const checkEmail = await prisma.user.findUnique({
      where: {
        email: body.email,
      },
    })
    if (!checkEmail)
      return res.status(400).json({ message: 'Email not found!' })
    // check password
    const checkPassword = await bcrypt.compare(
      body.password,
      checkEmail.password
    )
    if (!checkPassword)
      return res.status(400).json({ message: 'Password wrong!' })
    // generate token
    const token = await jwt.sign(checkEmail, String(process.env.JWT_SECRET_KEY))
    return res.json({ token: token })
  } catch (error: any) {
    console.log(error.message)
    return res.status(500).json({ message: error.message })
  }
})

router.post('/google', async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      code: string
    }
    const { tokens } = await oauth2Client.getToken(body.code)
    oauth2Client.setCredentials(tokens)

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2',
    })
    const googleProfile = await oauth2.userinfo.get()

    // insert user
    const user = await prisma.user.upsert({
      where: { email: String(googleProfile.data.email) },
      update: {
        name: String(googleProfile.data.name),
      },
      create: {
        name: String(googleProfile.data.name),
        email: String(googleProfile.data.email),
        password: '',
        provider: 'google',
      },
    })

    // generate token
    const token = await jwt.sign(user, String(process.env.JWT_SECRET_KEY))
    return res.json({ token: token })
  } catch (error: any) {
    console.log(error.message)
    return res.status(500).json({ message: error.message })
  }
})

router.get('/user', auth, async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    const user = jwt.verify(String(token), String(process.env.JWT_SECRET_KEY))
    return res.json({ user: user })
  } catch (error: any) {
    console.log(error.message)
    return res.status(500).json({ message: error.message })
  }
})

export default router
