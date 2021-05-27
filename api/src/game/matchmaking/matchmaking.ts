import { Socket } from 'socket.io'
import logger from '../../logger/'
import User from '../../models/User'
import { gameStart } from '../gameplay/gameplay'
import { Player } from '../Player'
import { UnmatchedPlayer } from "./UnmatchedPlayer"

const MAX_TIME_IN_QUEUE = 20000
const POOL_POLL_INTERVAL = 1000
const mm_pool = new Map<string, UnmatchedPlayer>()

export async function play(socket: Socket) {
  const user: User = socket.request['user']
  const player: Player = {
    id: user._id,
    username: user.username,
    mmr: user.mmr
  }
  if (player) {
    logger.info(`Player: ${player.username} with ${player.mmr} mmr requested to play`)
    const unmatchedPlayer: UnmatchedPlayer = {
      player: player,
      timeJoined: Date.now(),
      ws: socket
    }

    if (!mm_pool.has(unmatchedPlayer.player.id))
      mm_pool.set(unmatchedPlayer.player.id, unmatchedPlayer)
    else
      socket.disconnect()
  }

  setInterval(() => matchmake(mm_pool), POOL_POLL_INTERVAL)
}

function matchmake(mm_pool: Map<string, UnmatchedPlayer>) {
  if (mm_pool.size < 1) return

  //enabled down level iteration, look for better alternative
  for (const [A, p1] of mm_pool) {
    for (const [B, p2] of mm_pool) {
      if (isMatch(p1, p2)) {
        const a = mm_pool.get(A)
        const b = mm_pool.get(B)
        if (a && b) {
          matchmakingSuccess({ ...a }, { ...b })
          mm_pool.delete(A)
          mm_pool.delete(B)
        }
      } else {
        const b = mm_pool.get(B)
        if (b && Date.now() - b.timeJoined > MAX_TIME_IN_QUEUE) {
          b.ws.send(`${b.player.id} didn't find a match`)
          b.ws.disconnect()
          mm_pool.delete(B)
        }
      }
    }
  }
}

function isMatch(p1: UnmatchedPlayer, p2: UnmatchedPlayer): boolean {
  if (p1 !== p2 && Math.abs(p1.player.mmr - p2.player.mmr) < 500)
    if (Math.abs(p1.player.mmr - p2.player.mmr) < (10 * p1.timeJoined * 1000))
      return true
  return false
}

function matchmakingSuccess(p1: UnmatchedPlayer, p2: UnmatchedPlayer) {
  console.log(`${p1.player.id} was matched with ${p2.player.id}`)
  p1.ws.send(`${p1.player.id} you were matched with ${p2.player.id}`)
  p2.ws.send(`${p2.player.id} you were matched with ${p1.player.id}`)
  gameStart(p1, p2)
}