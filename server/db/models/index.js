const User = require('./user')
const Board = require('./board')
const Question = require('./question')


// ASSOCIATION //
Board.belongsTo(User)
User.hasMany(Board)

Question.belongsTo(Board)
Board.hasMany(Question)

Question.belongsTo(User)
User.hasMany(Question)

module.exports = {
  User,
  Board,
  Question
}
