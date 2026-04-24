// PartyKit sync server.
//
// One "room" per Clerk user id. y-partykit handles the Yjs websocket
// protocol; we only add a Clerk JWT check in onBeforeConnect so that a
// user can never open another user's room.
//
// Deploy: `npx partykit deploy`
// Set the Clerk secret: `npx partykit secret put CLERK_SECRET_KEY`

import { onConnect } from 'y-partykit';
import { verifyToken } from '@clerk/backend';
import type * as Party from 'partykit/server';

export default class SyncServer implements Party.Server {
  constructor(readonly room: Party.Room) {}

  // Gate the websocket upgrade before it is accepted. We pull the Clerk
  // session token from the query string (the client attaches it via the
  // y-partykit `params` option) and verify the token's `sub` matches the
  // room id. Anything off -> 401/403 so the client reconnect loop gives
  // up cleanly.
  static async onBeforeConnect(req: Party.Request, lobby: Party.Lobby) {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (!token) return new Response('missing token', { status: 401 });

    const secretKey = lobby.env.CLERK_SECRET_KEY as string | undefined;
    if (!secretKey) {
      return new Response('server missing CLERK_SECRET_KEY', { status: 500 });
    }

    // Room id is the last path segment — PartyKit URL is
    // /parties/<party-name>/<room-id>.
    const roomId = url.pathname.split('/').filter(Boolean).pop();
    if (!roomId) return new Response('no room id', { status: 400 });

    try {
      const claims = await verifyToken(token, { secretKey });
      if (claims.sub !== roomId) {
        return new Response('wrong room', { status: 403 });
      }
    } catch {
      return new Response('bad token', { status: 401 });
    }
    return req;
  }

  async onConnect(conn: Party.Connection) {
    return onConnect(conn, this.room, {
      // Snapshot mode keeps one rolling copy of the doc in PartyKit
      // storage rather than an append-only update log. Fine for our
      // write volume and cheaper.
      persist: { mode: 'snapshot' },
    });
  }
}
