import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Router } from '@angular/router'
import { Observable } from 'rxjs'
import { catchError } from 'rxjs/operators'

@Injectable()
export class AuthInterceptorService implements HttpInterceptor {

  constructor(private router: Router) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const idToken = localStorage.getItem('postmessages_token')

    if (idToken) {
      const cloned = req.clone({
        headers: req.headers.set('Authorization', idToken)
      })
      return next.handle(cloned).pipe(
        catchError((err) => {
          if (err && err.status === 401) {
            this.router.navigate(['/login'])
          }
          return next.handle(req)
        })
      )
    }
    return next.handle(req)

  }
}
