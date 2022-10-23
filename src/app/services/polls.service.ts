import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { delay, Observable } from 'rxjs';
import { IPoll, IPollGroup } from '../interfaces/poll';
import { REST_API_URL } from '../shared/constants';

@Injectable({
  providedIn: 'root',
})
export class PollsService {
  constructor(private http: HttpClient) {}

  getPollById(pollId: string): Observable<IPoll> {
    const URL = `${REST_API_URL}/poll/${pollId}`;
    return this.http.get<IPoll>(URL).pipe(delay(2000));
  }

  getAllPolls(): Observable<IPollGroup[]> {
    const URL = `${REST_API_URL}/polls`;
    return this.http.get<IPollGroup[]>(URL);
  }
}
