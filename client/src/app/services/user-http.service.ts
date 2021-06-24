import { HttpClient, HttpHeaders } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'

@Injectable()
export class UserHttpService {
  public url = 'http://localhost:5000';

  constructor(private http: HttpClient) { }

  register(user: any): Observable<any> {
    const options = {
      headers: new HttpHeaders({
        'cache-control': 'no-cache',
        'Content-Type': 'application/json',
      })
    }

    return this.http.post(this.url + '/signup', user, options).pipe(
      tap((data) => {
        console.log(JSON.stringify(data))
      })
    )

  }

  getUserProfile() {
    return this.http.get(`${this.url}/auth/profile`)
  }

  getOtherUserProfile(username: string) {
    return this.http.get(`${this.url}/auth/profile/user/${username}`)
  }

  addFriend(username: string) {
    const data = { 'requestedUsername': username }
    const config = { headers: new HttpHeaders().set('Content-Type', 'application/json') }
    return this.http.post(`${this.url}/auth/friends`, data, config)
  }

  respondFriendRequest(hasAccepted: boolean, username: string) {
    const data = { 'hasAccepted': hasAccepted, 'askerUsername': username }
    const config = { headers: new HttpHeaders().set('Content-Type', 'application/json') }
    return this.http.post(`${this.url}/auth/friends/friendrequests`, data, config)
  }

  searchUser(username: string) {
    return this.http.get(`${this.url}/auth/search?username=${username}`)
  }

  deleteFriend(user: any) {
    const config = { headers: new HttpHeaders().set('Content-Type', 'application/json') }
    return this.http.delete(`${this.url}/auth/friends/${user}`)
  }

  newPassword(current: string, newPass: string) {
    const data = { 'currentPass': current, 'newPass': newPass }
    const config = { headers: new HttpHeaders().set('Content-Type', 'application/json') }
    return this.http.post(`${this.url}/auth/profile/newpassword`, data, config)
  }
}
