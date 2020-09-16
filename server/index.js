const express = require('express')
const path = require('path')
const morgan = require('morgan')
const bodyParser = require('body-parser')
const cluster = require('cluster')
const compression = require('compression')
const passport = require('passport')
const session = require('express-session')
// initalize sequelize with session store
const SequelizeStore = require('connect-session-sequelize')(session.Store)
const db = require('./db')
const sessionStore = new SequelizeStore({ db })
const socketio = require('socket.io')
const PORT = process.env.PORT || 5000

// This is a global Mocha hook, used for resource cleanup.
// Otherwise, Mocha v4+ never quits after tests.
if (process.env.NODE_ENV === 'test') {
  after('close the session store', () => sessionStore.stopExpiringSessions())
}

const isDev = process.env.NODE_ENV !== 'production'
// if(isDev) require('../secrets') // TODO: delete if requie('secret') in else block works

// code to run if you are in the master process
if(!isDev && cluster.isMaster) {
  // Count the machine's CPUs
  const cpuCount = require('os').cpus().length
  // Create a worker for each CPU
  for (let i=0; i< cpuCount; i++) {
    cluster.fork()
  }
} else {
  require('../secrets')
  const app = express()
  module.exports = app

  // passport registration
  passport.serializeUser((user, done) => done(null, user.id))

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await db.models.user.findByPk(id)
      done(null, user)
    } catch (err) {
      done(err)
    }
  })

  const createApp = () => {
    app.use(morgan('dev')) // logging
    // body parsing middlewares
    app.use(bodyParser.json())
    app.use(express.json())
    app.use(express.urlencoded({ extended: true }))
    app.use(compression())

    app.use(
      session({
        secret: process.env.SESSION_SECRET,
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
      })
    )

    //TODO: Check if I need this
    sessionStore.sync()

    // consumes 'req.session' so that passport can know what's on the session
    app.use(passport.initialize())
    // this will invoke our registered 'deserializeUser' method
    // and attempt to put our user on 'req.user'
    app.use(passport.session())

    app.use(express.static(path.resolve(__dirname, '../client/public')))

      // auth and api routes
    app.use('/auth', require('./auth'))
    app.use('/api', require('./api'))

   // any remaining requests with an extension (.js, .css, etc.) send 404
   app.use((req, res, next) => {
    if (path.extname(req.path).length) {
      const err = new Error('Not found')
      err.status = 404
      next(err)
    } else {
      next()
    }
  })

   // All remaining requests return the React app, so it can handle routing.
   app.get('*', function (request, response) {
    response.sendFile(
      path.resolve(__dirname, '../react-ui/build', 'index.html')
    )
  })

  app.use((err, req, res, next) => {
    console.error(err)
    console.error(err.stack)
    res.status(err.status || 500).send(err.message || 'Internal server error.')
  })

  }

  const startListening = () => {
    // start listening (and create a 'server' object representing our server)
    const server = app.listen(PORT, () =>
      console.log(`Mixing it up on port ${PORT}`)
    )

    // set up our socket control center
    const io = socketio(server)
    require('./socket')(io)
  }

  // TODO: const syncDb = () => db.sync()
  const syncDb = () => db.sync({ force: true })

  async function bootApp() {
    // await sessionStore.sync()
    await syncDb()
    await createApp()
    await startListening()
  }
  // This evaluates as true when this file is run directly from the command line,
  // i.e. when we say 'node server/index.js' (or 'nodemon server/index.js', or 'nodemon server', etc)
  // It will evaluate false when this module is required by another module - for example,
  // if we wanted to require our app in a test spec
  if (require.main === module) {
    bootApp()
  } else {
    createApp()
  }
}
