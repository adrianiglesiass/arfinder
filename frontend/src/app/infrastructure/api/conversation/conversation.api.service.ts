import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';

import type {
  ConversationCreate,
  ConversationResponse,
  MessageResponse,
} from '@core/api/api.models';

@Injectable({
  providedIn: 'root',
})
export class ConversationApiService {
  private readonly http = inject(HttpClient);
  private readonly APIURL = `${environment.APIURL}/conversations`;

  create(otherUserId: number): Promise<ConversationResponse> {
    const body: ConversationCreate = { other_user_id: otherUserId };
    return firstValueFrom(this.http.post<ConversationResponse>(this.APIURL, body));
  }

  list(): Promise<ConversationResponse[]> {
    return firstValueFrom(this.http.get<ConversationResponse[]>(this.APIURL));
  }

  get(conversationId: number): Promise<ConversationResponse> {
    return firstValueFrom(this.http.get<ConversationResponse>(`${this.APIURL}/${conversationId}`));
  }

  getMessages(conversationId: number): Promise<MessageResponse[]> {
    return firstValueFrom(
      this.http.get<MessageResponse[]>(`${this.APIURL}/${conversationId}/messages`)
    );
  }

  sendMessage(conversationId: number, content: string): Promise<MessageResponse> {
    return firstValueFrom(
      this.http.post<MessageResponse>(`${this.APIURL}/${conversationId}/messages`, {
        content,
      })
    );
  }

  sendMessageToUser(recipientUserId: number, content: string): Promise<MessageResponse> {
    return firstValueFrom(
      this.http.post<MessageResponse>(`${this.APIURL}/with/${recipientUserId}/messages`, {
        content,
      })
    );
  }

  async markAsRead(conversationId: number): Promise<void> {
    await firstValueFrom(
      this.http.patch(`${this.APIURL}/${conversationId}/read`, {} as Record<string, unknown>)
    );
  }
}
