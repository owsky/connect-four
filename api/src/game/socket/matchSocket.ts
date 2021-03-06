import { userInfo } from 'os'
import { Server as IOServer, Socket } from 'socket.io'
import { promisify } from 'util'
import logger from '../../logger'
import User from '../../models/User'
import { endMatch } from '../../mongo/matchMethods'
import { getUserById } from '../../mongo/userMethods'
import { redisClient as redis } from '../../setup/setupRedis'
import { Match } from '../gameplay/Match'
import PlayerWithWS from '../matchmaking/UnmatchedPlayer'

// Promisifed Redis hashmap get method
const hgetAsync = promisify(redis.hget).bind(redis)
const hsetAsync = promisify(redis.hset).bind(redis)

/**
 * Handles events for the newly created match Socket.io server
 * @param match Match object containing the relative info
 * @param p1 separate player reference with websocket instance 
 * @param p2 separate player reference with websocket instance
 * @param io match Socket.io server instance
 * @param socket Socket client of the user
 */
export function matchCallback(match: Match, p1: PlayerWithWS, p2: PlayerWithWS, io: IOServer, socket: Socket, port: number): void {
  joinChat(socket, match)
  hsetAsync(['players', socket.id, socket.request['user'].username])

  getPlayers(match, socket)
  getGameBoard(match, socket)

  socket.on('message', (message: string) => {
    logger.info(message)
    chat(message, socket, match)
  })

  socket.on('insertDisc', (column: number) => { play(column, socket, match, p1, p2, io) })

  socket.on('disconnect', (reason: string) => {
    disconnect(reason, socket, p1, p2, io)
  })
}

function getPlayers(match: Match, socket: Socket) {
  const player1 = {
    username: match.player1.username,
    color: match.player1Color
  }
  const player2 = {
    username: match.player2.username,
    color: match.player2Color
  }
  socket.emit('gamePlayers', { player1, player2 })
}

/**
 * Emits game status to observer
 * @param match 
 * @param socket 
 */
function getGameBoard(match: Match, socket: Socket) {
  const user = socket.request['user']
  if (user.username !== match.player1.username && user.username !== match.player2.username)
    socket.emit("gameStatus", JSON.parse(JSON.stringify(match.game_board)))
}

/**
 * Self explanatory, joins the appropriate chat through a Socket.io
 * @param socket Socket client of the user who connected
 * @param match Match object containing the relative info
 */
function joinChat(socket: Socket, match: Match) {
  if ((socket.request['user']._id).toString() === (match.player1.id).toString() || (socket.request['user']._id).toString() === (match.player2.id).toString()) {
    socket.join(`${match.uuid}.player`)
  } else {
    socket.join(`${match.uuid}.observers`)
  }
}

/**
 * Forwards messages to the appropriate Socket.io rooms
 * @param message Message content
 * @param socket Socket client of the user who sent the message
 * @param match Match object containing the relative info
 */
function chat(message: string, socket: Socket, match: Match) {
  if ((socket.request['user']._id).toString() === (match.player1.id).toString() || (socket.request['user']._id).toString() === (match.player2.id).toString()) {
    socket
      .to(`${match.uuid}.player`)
    .to(`${match.uuid}.observers`)
    .emit('message', { message, player: socket.request['user'].username })

    logger.info("emitted to players && observers")
  }
  else {
    socket
      .to(`${match.uuid}.observers`)
      .emit('message', { message, player: socket.request['user'].username })
    logger.info("emitted to observers")
  }
}

/**
 * Processed the move sent by the user, if the user is allowed to play then the move gets
 * verified and if accepted it is relayed to all the other users
 * @param column Column where the user tried to insert the disc
 * @param socket Socket client of the user who sent the move
 * @param match Match object containing all the relative info
 * @param p1 Player object needed to send emits when the game is finished
 * @param p2 Player object needed to send emits when the game is finished
 * @param io match Socket.io server instance
 */
function play(column: number, socket: Socket, match: Match, p1: PlayerWithWS, p2: PlayerWithWS, io: IOServer) {
  const user: User = socket.request['user']
  const moveResult = match.addDot(column, user._id)
  logger.info(moveResult.accepted)
  if (moveResult.accepted) {
    io.emit('dot', { column, player: user.username })
    if (moveResult.matchResult) {
      io.emit('winner', `Player ${socket.request['user'].username} has won the match!`)
        ; (p1.ws as Socket).broadcast.emit('stoppedPlaying', p1.player.username)
        ; (p2.ws as Socket).broadcast.emit('stoppedPlaying', p2.player.username)

      closeServer(io, p1, p2)
    } else {
      socket.emit('moveRejection', column)
    }
  }
}

/**
 * If one of the two players disconnect early then the other wins and the server gets terminated
 * @param reason Reason of the player disconnection, provided by the Socket.io server
 * @param socket Socket client of the user who disconnected
 * @param player1 Player1 object
 * @param player2 Player2 object
 * @param io match Socket.io server instance
 */
async function disconnect(reason: string, socket: Socket, player1: PlayerWithWS, player2: PlayerWithWS, io: IOServer) {
  try {
    const username = await hgetAsync('players', socket.id)
    if (username === player1.player.username) {
      endMatch({ winner: player2.player.username, loser: username })
      io.emit('playerDisconnected', username, reason)
      closeServer(io, player1, player2)
    } else if (username === player2.player.username) {
      endMatch({ winner: player1.player.username, loser: username })
      io.emit('playerDisconnected', username, reason)
      closeServer(io, player1, player2)
    }
  } catch (err) {
    logger.prettyError(err)
  }
}

/**
 * Disconnects all sockets and then closes the server instance
 * @param io match Socket.io server instance
 */
function closeServer(io: IOServer, p1: PlayerWithWS, p2: PlayerWithWS) {
  notifyStoppedPlaying(p1)
  notifyStoppedPlaying(p2)
  io.disconnectSockets()
  io.close()
}

async function notifyStoppedPlaying(p: PlayerWithWS) {
  const user = await getUserById(p.player.id)
  user?.friends.forEach(friend => {
    ; (p.ws as Socket).to(friend).emit('stoppedPlaying', user.username)
  })
}