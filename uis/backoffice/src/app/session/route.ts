import { consumeSession, receiveSession } from "../../../../shared/session";

export const GET = consumeSession;
export function POST(request: Request) {
  return receiveSession(request, true);
}
