import {Injectable} from '@angular/core';
import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {Observable} from 'rxjs/Observable';
import {AuthService} from 'ngx-auth';

import {TokenStorage} from './token-storage.service';
import 'rxjs/add/operator/switchMap';
import {BaseService} from '../shared/_services/base.service';

interface AccessData {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthenticationService implements AuthService {

  constructor(private _baseService: BaseService,
              private http: HttpClient,
              private tokenStorage: TokenStorage) {
  }

  /**
   * Check, if user already authorized.
   * @description Should return Observable with true or false values
   * @returns {Observable<boolean>}
   * @memberOf AuthService
   */
  public isAuthorized(): Observable<boolean> {
    return TokenStorage
      .getAccessToken()
      .map(token => !!token);
  }

  /**
   * Get access token
   * @description Should return access token in Observable from e.g.
   * localStorage
   * @returns {Observable<string>}
   */
  public getAccessToken(): Observable<string> {
    return TokenStorage.getAccessToken();
  }

  /**
   * Function, that should perform refresh token verifyTokenRequest
   * @description Should be successfully completed so interceptor
   * can execute pending requests or retry original one
   * @returns {Observable<any>}
   */
  public refreshToken(): Observable<AccessData> {
    return TokenStorage
      .getRefreshToken()
      .switchMap((refreshToken: string) => {
        return this.http.post(this._baseService.getBaseUrl() + 'api/auth/token/refresh/', {refreshToken});
      })
      .do(this.saveAccessData.bind(this))
      .catch((err) => {
        this.logout();

        return Observable.throw(err);
      });
  }

  /**
   * Function, checks response of failed request to determine,
   * whether token be refreshed or not.
   * @description Essentialy checks status
   * @param {Response} response
   * @returns {boolean}
   */
  public refreshShouldHappen(response: HttpErrorResponse): boolean {
    return response.status === 401;
  }

  /**
   * Verify that outgoing request is refresh-token,
   * so interceptor won't intercept this request
   * @param {string} url
   * @returns {boolean}
   */
  public verifyTokenRequest(url: string): boolean {
    return url.endsWith('/refresh/');
  }

  /**
   * EXTRA AUTH METHODS
   */

  public login(credentials): Observable<any> {

    return this.http.post(this._baseService.getBaseUrl() + 'api/auth/token/', credentials)
      .do(
        (tokens: any) => {
          this.saveAccessData({
            'accessToken': tokens.token,
            'refreshToken': tokens.token
          });
        }
      );
  }

  /**
   * Logout
   */
  public logout(): void {
    this.tokenStorage.clear();
    location.reload(true);
  }

  /**
   * Save access data in the storage
   *
   * @private
   * @param {AccessData} data
   */
  private saveAccessData({accessToken, refreshToken}: AccessData) {
    this.tokenStorage
      .setAccessToken(accessToken)
      .setRefreshToken(refreshToken);
  }

  public getHeaders(token: string): { [name: string]: string | string[] } {
    return {
      'Authorization': `JWT ${token}`
    };
  }
}
