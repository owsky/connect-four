import { Injectable } from '@angular/core'
import { Observable } from 'rxjs'
import { io, Socket } from 'socket.io-client'
import { environment } from 'src/environments/environment'
import { AuthenticationService } from './auth/authentication.service'
import { GamesocketService } from './gamesocket.service'

@Injectable({
  providedIn: 'root'
})
export class SocketioService {
  socket: Socket | undefined
  gamesocket: Socket | undefined

  public otherPlayer: string = ''
  public isFirst: boolean = false
  public color: string = ''

  constructor(
    private gs: GamesocketService,
    private auth: AuthenticationService
  ) {
    const token = this.auth.getToken()
    if (token)
      this.connect(token.replace("Bearer ", ""))
  }

  connect(token: any) {
    this.socket = io(environment.SOCKET_ENDPOINT, {
      extraHeaders: {
        'x-auth-token': token
      },
      transportOptions: {
        polling: {
          extraHeaders: {
            'x-auth-token': token
          }
        }
      },
    })
    this.socket.on('ok', message => {
      console.log(message)
    })
    this.socket.emit('joinGame', 'joined on initial websocket')
  }

  receiveMatchPort(token: any) {
    console.log('waiting for port')
    this.socket?.on('matched', (message: any) => {
      console.log(message)
      this.isFirst = message.first
      this.color = message.color
      this.otherPlayer = message.otherPlayer
      this.gs.connectMatch(
        io('http://localhost:' + message.port, {
          'forceNew': true,
          extraHeaders: {
            'x-auth-token': token
          },
          transportOptions: {
            polling: {
              extraHeaders: {
                'x-auth-token': token
              }
            }
          },
        }))
    })
  }

  startGame() {
    this.socket?.emit('startGame', "someone is starting the game")
    this.socket?.emit('play')
  }

  cancelPlay() {
    console.log("calcel play request")
    this.socket?.emit('cancelPlay')
  }

  receiveStartedPlaying() {
    return new Observable((observer) => {
      this.socket?.on('startedPlaying', (message) => {
        observer.next(message)
      })
    })
  }

  receiveStoppedPlaying() {
    return new Observable((observer) => {
      this.socket?.on('stoppedPlaying', (message) => {
        observer.next(message)
      })
    })
  }

  sendInviteRequest(username: string) {
    this.socket?.emit('invite', username)
  }

  sendInviteResponse(hasAccepted: boolean, username: string) {
    var message = {
      hasAccepted: hasAccepted,
      inviterUsername: username,
    }
    this.socket?.emit('inviteResponse', message)
  }
}
