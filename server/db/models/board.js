const Sequelize = require('sequelize')
const db = require('../db')

const Board = db.define('board', {
  name: {
    type: Sequelize.STRING,
    unique: true,
    allowNull: false
  },
  description: {
    type: Sequelize.TEXT,
    allowNull: false
  },
})

module.exports = Board
