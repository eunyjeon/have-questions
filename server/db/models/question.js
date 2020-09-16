const Sequelize = require('sequelize')
const db = require('../db')

const Question = db.define('question', {
  userName: {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: 'WhoAmI'
  },
  content: {
    type: Sequelize.TEXT,
    allowNull: false
  },
  isAnswered: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  }
})

module.exports = Question
