import { appUrl } from "./mail";

export function inviteLink(code: string) {
  return appUrl(`/convite/${code}`);
}

export function inviteText(groupName: string, code: string) {
  return `⚽ Bora pra *${groupName}*!\n\nEntra no app da pelada pra confirmar presença, ver os times e as estatísticas:\n${inviteLink(code)}`;
}
