import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    jwt.verify(String(token), String(process.env.JWT_SECRET_KEY))
    next()
  } catch (error) {
    return res.status(401).json('Unauthorized')
  }
}
