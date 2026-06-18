import { AdminShell } from "@/app/_components/admin-shell";
import { SectionCard } from "@/app/_components/section-card";
import { StatusPill } from "@/app/_components/status-pill";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getHistoryEvents } from "@/lib/mock-data";

const toneByResult = {
  info: "accent",
  success: "good",
  warning: "warn",
  error: "bad",
} as const;

export default async function HistoryPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const events = await getHistoryEvents(locale);

  return (
    <AdminShell
      locale={locale}
      activePath="/history"
      title={dict.historyPage.title}
      description={dict.historyPage.description}
      actions={
        <button type="button" className="button secondary">
          {dict.common.exportLog}
        </button>
      }
    >
      <SectionCard
        eyebrow={dict.common.events}
        title={dict.historyPage.recentHistory}
        description={dict.historyPage.recentHistoryDesc}
      >
        <div className="table-wrap">
          <table className="data-table dense-table">
            <thead>
              <tr>
                <th>{dict.common.time}</th>
                <th>{dict.common.series}</th>
                <th>{dict.common.source}</th>
                <th>{dict.historyPage.event}</th>
                <th>{dict.common.result}</th>
                <th>{dict.common.detail}</th>
              </tr>
            </thead>
            <tbody>
              {events.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.at}</td>
                  <td>{entry.seriesTitle}</td>
                  <td>{entry.sourceName}</td>
                  <td>{entry.event}</td>
                  <td>
                    <StatusPill tone={toneByResult[entry.result]}>
                      {dict.statusLabels[entry.result]}
                    </StatusPill>
                  </td>
                  <td>{entry.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </AdminShell>
  );
}
