import { useEffect, useRef, useCallback } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { GameState } from '../types/game';

const WS_URL = 'http://localhost:8080/ws';

export function useGameWebSocket(
  gameId: string | null,
  onStateUpdate: (state: GameState) => void
) {
  const clientRef = useRef<Client | null>(null);

  const connect = useCallback(() => {
    if (!gameId) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      onConnect: () => {
        console.log('WebSocket connesso');
        client.subscribe(`/topic/game/${gameId}`, (msg: IMessage) => {
          const state: GameState = JSON.parse(msg.body);
          onStateUpdate(state);
        });
      },
      onDisconnect: () => console.log('WebSocket disconnesso'),
      onStompError: (frame) => console.error('STOMP error', frame),
      reconnectDelay: 3000,
    });

    client.activate();
    clientRef.current = client;
  }, [gameId, onStateUpdate]);

  useEffect(() => {
    connect();
    return () => {
      clientRef.current?.deactivate();
    };
  }, [connect]);

  const sendAction = useCallback((destination: string, body: object) => {
    clientRef.current?.publish({
      destination: `/app/game/${gameId}/${destination}`,
      body: JSON.stringify(body),
    });
  }, [gameId]);

  return { sendAction };
}
