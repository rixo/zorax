#!/usr/bin/env node

import 'trace'
import 'clarify'

import maps from 'source-map-support'

import { run } from './lib/zoar.js'

const hasMap = process.argv
  .slice(2)
  .some(arg => arg === '--map' || /^-[a-z]*m[a-z]*$/.test(arg))

if (hasMap) {
  maps.install()
}

run()
