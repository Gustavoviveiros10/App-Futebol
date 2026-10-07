import Link from "next/link";
import { MapPin, Trophy } from "lucide-react";
import { fmtDayMonth, fmtTime, weekdayLong } from "@/lib/format";
import { MATCH_STATUS_LABEL } from "@/lib/matches";
import { Badge } from "./ui";

type Props = {
  href: string;
  date: Date;
  location: string | null;
  status: keyof typeof MATCH_STATUS_LABEL;
  tz: string;
  confirmed: number;
  max: number | null;
  teams?: { name: string; score: number | null; color: string }[];
  mvp?: string | null;
};

export function MatchCard({ href, date, location, status, tz, confirmed, max, teams, mvp }: Props) {
  const st = MATCH_STATUS_LABEL[status];
  return (
    <Link href={href} className="card flex items-center gap-4 transition hover:ring-accent/40">
      <div className="flex w-14 shrink-0 flex-col items-center rounded-2xl bg-fg/[0.04] py-2">
        <span className="text-[11px] font-bold uppercase text-fg/45">{weekdayLong(date, tz).slice(0, 3)}</span>
        <span className="text-lg font-black leading-tight">{fmtDayMonth(date, tz).split(" ")[0]}</span>
        <span className="text-[11px] font-semibold uppercase text-fg/45">{fmtDayMonth(date, tz).split(" ")[2] ?? fmtDayMonth(date, tz).split(" ")[1]}</span>
      </div>
      <div className="min-w-0 flex-1">
        {status === "FINISHED" && teams && teams.length >= 2 ? (
          <p className="truncate font-bold">{teams.map((t) => `${t.name.replace("Time ", "")} ${t.score ?? "-"}`).join(" × ")}</p>
        ) : (
          <p className="font-bold">{fmtTime(date, tz)}</p>
        )}
        {location && (
          <p className="flex items-center gap-1 truncate text-sm text-fg/50">
            <MapPin size={13} /> {location}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Badge tone={st.tone}>{st.label}</Badge>
          {status !== "FINISHED" && status !== "CANCELED" && <Badge>{max ? `${confirmed}/${max}` : confirmed} confirmados</Badge>}
          {mvp && <Badge tone="amber"><Trophy size={11} /> {mvp}</Badge>}
        </div>
      </div>
    </Link>
  );
}
