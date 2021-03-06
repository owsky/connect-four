import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core'
import { Router } from '@angular/router'
import Friend from 'src/app/interfaces/Friend'
import { GamesocketService } from 'src/app/services/gamesocket.service'
import { SocketioService } from 'src/app/services/socketio.service'
import { UserHttpService } from 'src/app/services/user-http.service'

@Component({
  selector: 'app-friend',
  templateUrl: './friend.component.html',
  styleUrls: ['./friend.component.scss']
})
export class FriendComponent implements OnInit {
  @Input() friend!: Friend
  @Output() chatEvent = new EventEmitter()
  username: string

  constructor(
    private userHttpService: UserHttpService,
    private router: Router,
    private gameSocketService: GamesocketService,
    private socketioService: SocketioService
  ) {
    this.username = this.userHttpService.username
  }

  ngOnInit(): void {
  }

  //starts to spectate the game in progess
  spectate() {
    if (this.friend.port)
      this.gameSocketService.connectMatch(this.friend.port)
  }

  //invites a user from its friend list ot play a game
  inviteToPlay() {
    this.socketioService.sendInviteRequest(this.friend.username)
  }

  //opens the chat of the related user
  openChat() {
    this.chatEvent.emit(this.friend.username)
  }
}
