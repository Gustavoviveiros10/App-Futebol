/** Divisão do churrasco: quem deve quanto e quem paga quem (Pix), com o mínimo de transferências. */

export type BbqPersonLite = { id: string; name: string; attending: boolean; drinks: boolean; paid: boolean };
export type BbqItemLite = { id: string; amountCents: number; payerId: string; drinksOnly: boolean };
export type Transfer = { from: string; to: string; cents: number };

export function splitBbq(people: BbqPersonLite[], items: BbqItemLite[]) {
  const going = people.filter((p) => p.attending);
  const drinkers = going.filter((p) => p.drinks);
  const share = new Map(people.map((p) => [p.id, 0]));
  const paid = new Map(people.map((p) => [p.id, 0]));

  for (const it of items) {
    paid.set(it.payerId, (paid.get(it.payerId) ?? 0) + it.amountCents);
    const among = it.drinksOnly ? drinkers : going;
    if (!among.length) continue;
    // divide em centavos; a sobra vai para os primeiros
    const base = Math.floor(it.amountCents / among.length);
    let rest = it.amountCents - base * among.length;
    for (const p of among) {
      share.set(p.id, share.get(p.id)! + base + (rest > 0 ? 1 : 0));
      if (rest > 0) rest--;
    }
  }

  const total = items.reduce((s, i) => s + i.amountCents, 0);
  const balance = people.map((p) => ({ id: p.id, name: p.name, share: share.get(p.id)!, paid: paid.get(p.id)!, net: paid.get(p.id)! - share.get(p.id)! }));

  const debtors = balance.filter((b) => b.net < 0).map((b) => ({ id: b.id, left: -b.net })).sort((a, b) => b.left - a.left);
  const creditors = balance.filter((b) => b.net > 0).map((b) => ({ id: b.id, left: b.net })).sort((a, b) => b.left - a.left);
  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const cents = Math.min(debtors[i].left, creditors[j].left);
    if (cents > 0) transfers.push({ from: debtors[i].id, to: creditors[j].id, cents });
    debtors[i].left -= cents;
    creditors[j].left -= cents;
    if (debtors[i].left === 0) i++;
    if (creditors[j].left === 0) j++;
  }
  return { total, going: going.length, drinkers: drinkers.length, balance, transfers };
}
