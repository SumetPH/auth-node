import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import router from './router'

const app = express()
app.use(cors())
app.use(express.urlencoded({ extended: false }))
app.use(express.json())
app.use(router)

const PORT = process.env.PORT || 8000
app.listen(PORT, () => console.log(`host: http://localhost:${PORT}`))
