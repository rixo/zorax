import * as fs from 'fs'
import { promisify } from 'util'

// fs.createReadStream('test.log').pipe(fs.createWriteStream('newLog.log'));
export const { copyFile, writeFile, readFile } = fs.promises

export const fstat = promisify(fs.fstat)

export const exists = (...args) =>
  new Promise(resolve => fs.exists(...args, resolve))
